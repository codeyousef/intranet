// app/api/viva-engage-graph/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Helper function for terminal logging
function terminalLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[VIVA-ENGAGE-GRAPH][${timestamp}][${level}]`;
  let formattedMessage = `${prefix} ${message}`;

  // Add data if provided and it's important
  if (data !== undefined) {
    if (typeof data === 'object') {
      try {
        // Only include full object data for errors and warnings
        if (level === 'ERROR' || level === 'WARN') {
          formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
        } else {
          // For INFO, just log a summary if it's an object
          const summary = typeof data.length === 'number' ? 
            `[Object with length: ${data.length}]` : 
            '[Object summary]';
          formattedMessage += ` ${summary}`;
        }
      } catch (e) {
        formattedMessage += `\n[Object cannot be stringified]`;
      }
    } else {
      formattedMessage += ` ${data}`;
    }
  }

  // Log to console
  if (level === 'INFO') {
    console.log(formattedMessage);
  } else if (level === 'WARN') {
    console.warn(formattedMessage);
  } else if (level === 'ERROR') {
    console.error(formattedMessage);
  }
}

/**
 * This API route fetches Viva Engage (Yammer) data using the Microsoft Graph API.
 * It returns the data in a format that can be used to create a custom UI,
 * avoiding the CSP issues that occur when trying to directly embed Yammer in an iframe.
 */
export async function GET(request: NextRequest) {
  terminalLog('INFO', 'Viva Engage Graph API route called');

  try {
    // Get the user's session
    terminalLog('INFO', 'Getting auth session...');
    const session = await getAuthSession();
    terminalLog('INFO', 'Auth session retrieved', session ? 'Session exists' : 'No session');

    if (!session || !session.accessToken) {
      terminalLog('ERROR', 'Authentication required - no session or access token');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          message: 'You must be logged in to access Viva Engage content',
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const feedType = url.searchParams.get('feedType') || 'home';
    const communityId = url.searchParams.get('communityId');

    // Determine the appropriate Graph API endpoint based on the feed type
    let graphApiUrl = '';

    if (feedType === 'community' && communityId) {
      // Fetch posts from a specific community
      graphApiUrl = `https://graph.microsoft.com/v1.0/groups/${communityId}/threads`;
    } else {
      // Fetch Yammer communities the user is a member of
      // Using a simpler approach - get all groups and filter client-side
      graphApiUrl = 'https://graph.microsoft.com/v1.0/groups';
    }

    terminalLog('INFO', 'Fetching Viva Engage data from Graph API', graphApiUrl);
    terminalLog('INFO', 'Using access token', session.accessToken ? `${session.accessToken.substring(0, 10)}...` : 'No token');

    // Make the request to the Graph API
    const response = await fetch(graphApiUrl, {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      terminalLog('ERROR', `Graph API returned status: ${response.status}`, errorText);

      return NextResponse.json(
        {
          success: false,
          error: `Graph API returned status: ${response.status}`,
          details: errorText,
        },
        { status: response.status }
      );
    }

    // Parse the response
    const data = await response.json();
    terminalLog('INFO', 'Graph API response received', data);

    // Log the number of groups received
    if (data.value && Array.isArray(data.value)) {
      terminalLog('INFO', `Received ${data.value.length} groups from Graph API`);

      // Log information about groupTypes if we're fetching communities
      if (feedType === 'home') {
        // Log more detailed information about the first few groups to help diagnose
        const detailedGroupInfo = data.value.slice(0, 3).map((group: any) => ({
          id: group.id,
          displayName: group.displayName,
          description: group.description,
          groupTypes: group.groupTypes || [],
          visibility: group.visibility,
          mail: group.mail,
          mailEnabled: group.mailEnabled,
          securityEnabled: group.securityEnabled,
          createdDateTime: group.createdDateTime
        }));
        terminalLog('INFO', 'Detailed group information (first 3 groups)', detailedGroupInfo);

        // Log summary of all groups
        const groupTypesInfo = data.value.map((group: any) => ({
          id: group.id,
          displayName: group.displayName,
          groupTypes: group.groupTypes || []
        }));
        terminalLog('INFO', 'Group types information', groupTypesInfo);

        // Count groups with Yammer type
        const yammerGroupsCount = data.value.filter((group: any) => 
          group.groupTypes && Array.isArray(group.groupTypes) && group.groupTypes.includes('Yammer')
        ).length;
        terminalLog('INFO', `Found ${yammerGroupsCount} Yammer groups`);
      }
    }

    // Transform the data into a format that's easier to use in the UI
    let transformedData;

    if (feedType === 'community' && communityId) {
      // Transform community threads data
      transformedData = {
        type: 'community',
        communityId,
        posts: data.value.map((thread: any) => ({
          id: thread.id,
          title: thread.topic,
          content: thread.preview,
          createdDateTime: thread.createdDateTime,
          lastReplyDateTime: thread.lastDeliveredDateTime,
          replyCount: thread.posts ? thread.posts.length : 0,
          author: thread.lastPostCreatedBy ? {
            name: thread.lastPostCreatedBy.user.displayName,
            email: thread.lastPostCreatedBy.user.emailAddress,
          } : null,
        })),
      };
    } else {
      // Transform Yammer communities data
      // Include all groups as potential Yammer communities
      // This ensures we don't miss any communities due to filtering
      const yammerCommunities = data.value;

      // Log that we're including all groups
      terminalLog('INFO', `Including all ${data.value.length} groups as potential Yammer communities`);

      // For debugging purposes, count how many would match each method
      if (feedType === 'home') {
        const byGroupType = data.value.filter((g: any) => g.groupTypes && Array.isArray(g.groupTypes) && g.groupTypes.includes('Yammer')).length;
        const byMail = data.value.filter((g: any) => g.mail && typeof g.mail === 'string' && g.mail.toLowerCase().includes('yammer')).length;
        const byName = data.value.filter((g: any) => g.displayName && typeof g.displayName === 'string' && 
                                 (g.displayName.toLowerCase().includes('yammer') || 
                                  g.displayName.toLowerCase().includes('viva') || 
                                  g.displayName.toLowerCase().includes('engage'))).length;
        const byDescription = data.value.filter((g: any) => g.description && typeof g.description === 'string' && 
                                      (g.description.toLowerCase().includes('yammer') || 
                                       g.description.toLowerCase().includes('viva') || 
                                       g.description.toLowerCase().includes('engage'))).length;
        const byCharacteristics = data.value.filter((g: any) => 
                                        g.mailEnabled === false && 
                                        g.securityEnabled === false && 
                                        !g.displayName?.toLowerCase().includes('sharepoint')).length;

        terminalLog('INFO', 'Groups that match each method:', {
          byGroupType,
          byMail,
          byName,
          byDescription,
          byCharacteristics,
          total: yammerCommunities.length
        });
      }

      transformedData = {
        type: 'home',
        communities: yammerCommunities.map((community: any) => ({
          id: community.id,
          name: community.displayName,
          description: community.description,
        })),
      };
    }

    // Return the transformed data
    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    terminalLog('ERROR', 'Error fetching Viva Engage data', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Error fetching Viva Engage data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
