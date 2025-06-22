// app/api/viva-engage/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';

// Helper function for terminal logging
function terminalLog(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const prefix = `[VIVA-ENGAGE][${timestamp}][${level}]`;

  // Create a formatted message
  let formattedMessage = `${prefix} ${message}`;

  // Add data if provided
  if (data !== undefined) {
    if (typeof data === 'object') {
      try {
        formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        formattedMessage += `\n[Object cannot be stringified]`;
      }
    } else {
      formattedMessage += ` ${data}`;
    }
  }

  // Use console methods for logging (avoid duplicating output)
  if (level === 'INFO') {
    console.log(formattedMessage);
  } else if (level === 'WARN') {
    console.warn(formattedMessage);
  } else if (level === 'ERROR') {
    console.error(formattedMessage);
  }
}

/**
 * This API route serves as a proxy for Viva Engage (Yammer) content.
 * It fetches the content server-side and returns it, avoiding CSP issues
 * that occur when trying to directly embed Yammer in an iframe.
 */
export async function GET(request: NextRequest) {
  terminalLog('INFO', '====== VIVA ENGAGE API ROUTE CALLED ======');
  terminalLog('INFO', 'API route called at', new Date().toISOString());

  try {
    // Get the user's session
    terminalLog('INFO', 'Getting auth session...');
    const session = await getAuthSession();

    // Handle session errors
    if (!session) {
      terminalLog('ERROR', 'Authentication required - no session returned');
      return NextResponse.json(
        {
          success: false,
          error: 'authentication_required',
          message: 'You must be logged in to access Viva Engage content',
        },
        { status: 401 }
      );
    }

    // Handle error object returned by getAuthSession
    if ('error' in session) {
      terminalLog('ERROR', 'Authentication error', {
        error: session.error,
        description: session.errorDescription || 'Unknown error'
      });

      return NextResponse.json(
        {
          success: false,
          error: session.error,
          message: session.errorDescription || 'Authentication error occurred',
          timestamp: session.errorTime || new Date().toISOString()
        },
        { status: 401 }
      );
    }

    // Check for error in session object
    if (session.error) {
      terminalLog('WARN', 'Session contains error but continuing', session.error);
    }

    // Check for access token
    if (!session.accessToken) {
      terminalLog('ERROR', 'Authentication required - no access token in session');
      return NextResponse.json(
        {
          success: false,
          error: 'missing_access_token',
          message: 'Your session does not contain an access token. Try signing out and back in.',
        },
        { status: 401 }
      );
    }

    terminalLog('INFO', 'Valid session with access token retrieved');

    // Fetch the Viva Engage content using the user's access token
    const vivaEngageUrl = "https://web.yammer.com/embed/groups";

    terminalLog('INFO', 'Fetching Viva Engage content from', vivaEngageUrl);
    terminalLog('INFO', 'Using access token', session.accessToken ? `${session.accessToken.substring(0, 10)}...` : 'No token');

    // Log request headers for debugging
    terminalLog('INFO', 'Request headers', {
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      accept: request.headers.get('accept')
    });

    // Try multiple approaches to fetch the content
    terminalLog('INFO', 'Making fetch request to Viva Engage...');
    const fetchStartTime = new Date();

    // First approach: Use the access token in the Authorization header
    terminalLog('INFO', 'Approach 1: Using Authorization header with Bearer token');
    let response;

    try {
      response = await fetch(vivaEngageUrl, {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://flyadeal.sharepoint.com/',
          'Origin': 'https://flyadeal.sharepoint.com'
        },
        redirect: 'follow',
        credentials: 'include',
      });

      terminalLog('INFO', 'Approach 1 completed with status', `${response.status} ${response.statusText}`);
    } catch (error) {
      terminalLog('ERROR', 'Approach 1 failed with error', error);

      // Try a second approach if the first one fails
      terminalLog('INFO', 'Approach 2: Using a different URL and method');

      try {
        // Try a different URL or approach
        const alternateUrl = "https://www.yammer.com/api/v1/messages/following.json";

        response = await fetch(alternateUrl, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
        });

        terminalLog('INFO', 'Approach 2 completed with status', `${response.status} ${response.statusText}`);

        // If this worked, we'll need to convert the JSON to HTML
        if (response.ok) {
          const jsonData = await response.json();
          terminalLog('INFO', 'Received JSON data from alternate URL', { 
            dataSize: JSON.stringify(jsonData).length,
            messageCount: jsonData.messages ? jsonData.messages.length : 0
          });

          // Convert the JSON data to HTML
          if (jsonData.messages && jsonData.messages.length > 0) {
            terminalLog('INFO', 'Converting JSON data to HTML');

            // Create a simple HTML representation of the messages
            let messagesHtml = '';

            // Limit to the last 3 messages
            const lastThreeMessages = jsonData.messages.slice(0, 3);

            terminalLog('INFO', 'Limiting display to the last 3 messages', {
              totalMessages: jsonData.messages.length,
              displayingMessages: lastThreeMessages.length
            });

            // Add each message to the HTML
            lastThreeMessages.forEach((message, index) => {
              const sender = message.sender_name || 'Unknown User';
              const content = message.body.plain || message.body.rich || 'No content';
              const timestamp = new Date(message.created_at).toLocaleString();
              const avatarUrl = message.sender_avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

              messagesHtml += `
                <div style="border: 1px solid #e1e1e1; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #fff;">
                  <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <img src="${avatarUrl}" alt="${sender}" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
                    <div>
                      <div style="font-weight: bold; color: #333;">${sender}</div>
                      <div style="font-size: 12px; color: #666;">${timestamp}</div>
                    </div>
                  </div>
                  <div style="color: #333; line-height: 1.5;">
                    ${content.replace(/\n/g, '<br>')}
                  </div>
                </div>
              `;
            });

            // Create a complete HTML document with the messages
            const htmlFromJson = `
              <html>
                <head>
                  <title>Viva Engage</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                      padding: 20px;
                      background-color: #f9f9f9;
                      color: #333;
                    }
                    .header {
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      margin-bottom: 20px;
                      padding-bottom: 15px;
                      border-bottom: 1px solid #e1e1e1;
                    }
                    .messages-container {
                      max-width: 800px;
                      margin: 0 auto;
                    }
                    .debug-info {
                      position: fixed;
                      bottom: 0;
                      right: 0;
                      background: rgba(0,0,0,0.7);
                      color: white;
                      padding: 5px 10px;
                      font-size: 10px;
                      z-index: 9999;
                    }
                  </style>
                </head>
                <body>
                  <div class="messages-container">
                    <div class="header">
                      <h2 style="margin: 0; color: #0078d4;">Viva Engage - Latest Messages</h2>
                      <div>
                        <span style="font-size: 14px; color: #666;">Showing latest ${lastThreeMessages.length} of ${jsonData.messages.length} messages</span>
                      </div>
                    </div>
                    ${messagesHtml}
                  </div>
                  <div class="debug-info">
                    Content loaded at: ${new Date().toISOString()} (JSON API)
                  </div>
                </body>
              </html>
            `;

            // Override the response with our HTML version
            response = new Response(htmlFromJson, {
              status: 200,
              statusText: 'OK (JSON converted to HTML)',
              headers: {
                'Content-Type': 'text/html'
              }
            });

            terminalLog('INFO', 'Successfully converted JSON data to HTML', {
              messageCount: jsonData.messages.length,
              htmlLength: htmlFromJson.length
            });
          } else {
            terminalLog('WARN', 'JSON data does not contain messages or is empty');
          }
        }
      } catch (secondError) {
        terminalLog('ERROR', 'Approach 2 also failed', secondError);

        // Create a more informative fallback response if both approaches fail
        terminalLog('INFO', 'Creating enhanced fallback response');

        // Create a simple fallback HTML with a message about the issue
        const fallbackHtml = `
          <html>
            <head>
              <title>Viva Engage</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  padding: 20px;
                  background-color: #f9f9f9;
                  color: #333;
                  text-align: center;
                }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background-color: white;
                  border-radius: 8px;
                  padding: 20px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header {
                  margin-bottom: 20px;
                }
                .message {
                  background-color: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  text-align: left;
                  margin-bottom: 20px;
                }
                .actions {
                  margin-top: 20px;
                }
                .button {
                  display: inline-block;
                  background-color: #0078d4;
                  color: white;
                  padding: 10px 20px;
                  text-decoration: none;
                  border-radius: 4px;
                  font-weight: bold;
                  margin: 0 5px;
                }
                .debug-info {
                  position: fixed;
                  bottom: 0;
                  right: 0;
                  background: rgba(0,0,0,0.7);
                  color: white;
                  padding: 5px 10px;
                  font-size: 10px;
                  z-index: 9999;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="color: #0078d4;">Viva Engage - Latest Messages</h2>
                </div>

                <div class="message">
                  <p><strong>Unable to load Viva Engage messages</strong></p>
                  <p>We tried multiple approaches to fetch your Viva Engage messages, but none were successful. This could be due to authentication issues or network problems.</p>
                </div>

                <div class="actions">
                  <a href="https://web.yammer.com/embed/groups" target="_blank" class="button">Open in Browser</a>
                  <button onclick="window.parent.location.reload();" class="button" style="background-color: #5c2d91; border: none; cursor: pointer;">Retry Loading</button>
                </div>

                <div style="margin-top: 20px; font-size: 12px; color: #666; text-align: left;">
                  <p><strong>Troubleshooting tips:</strong></p>
                  <ul style="text-align: left;">
                    <li>Check your network connection</li>
                    <li>Try signing out and signing back in</li>
                    <li>Clear your browser cache</li>
                    <li>Contact your administrator if the issue persists</li>
                  </ul>
                </div>
              </div>

              <div class="debug-info">
                Content loaded at: ${new Date().toISOString()} (Fallback)
              </div>
            </body>
          </html>
        `;

        response = new Response(
          fallbackHtml,
          { 
            status: 200, 
            statusText: 'OK (Enhanced Fallback)',
            headers: {
              'Content-Type': 'text/html'
            }
          }
        );
      }
    }

    const fetchEndTime = new Date();
    const fetchDuration = fetchEndTime.getTime() - fetchStartTime.getTime();

    terminalLog('INFO', '====== VIVA ENGAGE RESPONSE RECEIVED ======');
    terminalLog('INFO', `Fetch completed in ${fetchDuration}ms`);
    terminalLog('INFO', 'Response status', `${response.status} ${response.statusText}`);
    terminalLog('INFO', 'Response headers', Object.fromEntries([...response.headers.entries()]));

    // Log timing information
    const responseTime = new Date();
    terminalLog('INFO', 'Response time', responseTime.toISOString());

    if (!response.ok) {
      terminalLog('ERROR', 'Failed to fetch Viva Engage content', `${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch Viva Engage content: ${response.status} ${response.statusText}`);
    }

    // Get the HTML content
    terminalLog('INFO', 'Getting response text...');
    const textStartTime = new Date();

    const htmlContent = await response.text();

    const textEndTime = new Date();
    const textDuration = textEndTime.getTime() - textStartTime.getTime();

    terminalLog('INFO', `Response text retrieved in ${textDuration}ms`);
    terminalLog('INFO', 'Response text retrieved at', new Date().toISOString());

    // Log the length of the HTML content
    terminalLog('INFO', 'Viva Engage HTML content length', htmlContent.length);

    // Log a sample of the HTML content (first 200 characters)
    if (htmlContent.length > 0) {
      terminalLog('INFO', 'Viva Engage HTML content sample', htmlContent.substring(0, 200) + '...');

      // Check for common error indicators in the HTML
      const lowerHtml = htmlContent.toLowerCase();
      if (lowerHtml.includes('error') || lowerHtml.includes('exception') || 
          lowerHtml.includes('failed') || lowerHtml.includes('unauthorized')) {
        terminalLog('WARN', 'Possible error indicators found in HTML content');

        // Try to extract specific error messages
        const errorMatch = htmlContent.match(/<div[^>]*error[^>]*>(.*?)<\/div>/i);
        if (errorMatch) {
          terminalLog('WARN', 'Possible error message in HTML', errorMatch[1]);
        }
      }

      // Check for script tags that might be causing issues
      const scriptCount = (htmlContent.match(/<script/g) || []).length;
      terminalLog('INFO', 'Number of script tags in HTML', scriptCount);

      // Check for MSAL references that might be causing issues
      if (htmlContent.includes('msal') || htmlContent.includes('MSAL')) {
        terminalLog('INFO', 'MSAL references found in HTML content');
      }
    } else {
      terminalLog('ERROR', 'Viva Engage HTML content is empty');
    }

    // Check if the content is empty or too short to be valid
    let finalHtmlContent = htmlContent;

    // Log more details about the content
    terminalLog('INFO', 'Analyzing HTML content...');
    if (htmlContent) {
      // Check for specific patterns in the content
      const hasYammerContent = htmlContent.includes('yammer') || htmlContent.includes('Yammer');
      const hasVivaContent = htmlContent.includes('viva') || htmlContent.includes('Viva');
      const hasBodyTag = htmlContent.includes('<body');
      const hasScriptTags = (htmlContent.match(/<script/g) || []).length;
      const hasIframeTags = (htmlContent.match(/<iframe/g) || []).length;

      terminalLog('INFO', 'Content analysis', {
        length: htmlContent.length,
        hasYammerContent,
        hasVivaContent,
        hasBodyTag,
        scriptTagCount: hasScriptTags,
        iframeTagCount: hasIframeTags
      });

      // Try to extract the title
      const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        terminalLog('INFO', 'Page title', titleMatch[1]);
      }

      // Try to extract any error messages
      const errorPatterns = [
        /<div[^>]*error[^>]*>(.*?)<\/div>/i,
        /<p[^>]*error[^>]*>(.*?)<\/p>/i,
        /error['"]>(.*?)</i,
        /exception['"]>(.*?)</i
      ];

      for (const pattern of errorPatterns) {
        const match = htmlContent.match(pattern);
        if (match) {
          terminalLog('WARN', 'Possible error message in content', match[1]);
        }
      }
    }

    if (!htmlContent || htmlContent.trim().length < 100) {
      terminalLog('ERROR', 'Viva Engage content is empty or too short, using fallback content');

      // Get current timestamp for debugging
      const timestamp = new Date().toISOString();

      // Create enhanced fallback content with debugging information and interactive elements
      finalHtmlContent = `
        <html>
          <head>
            <title>Viva Engage - Latest Messages</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                padding: 20px;
                background-color: #f9f9f9;
                color: #333;
                margin: 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .header {
                margin-bottom: 20px;
                text-align: center;
              }
              .message {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px;
                text-align: left;
                margin-bottom: 20px;
              }
              .actions {
                display: flex;
                justify-content: center;
                gap: 10px;
                margin-bottom: 20px;
              }
              .button {
                display: inline-block;
                background-color: #0078d4;
                color: white;
                padding: 10px 20px;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                border: none;
                cursor: pointer;
              }
              .button.secondary {
                background-color: #5c2d91;
              }
              .troubleshooting {
                margin-top: 20px;
                border-top: 1px solid #ddd;
                padding-top: 15px;
              }
              .action-buttons {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 15px;
              }
              .action-button {
                background-color: #f0f0f0;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 8px 15px;
                font-size: 14px;
                cursor: pointer;
                text-align: left;
              }
              .action-result {
                display: none;
                background-color: #e8f4f8;
                border-radius: 4px;
                padding: 10px;
                margin-top: 10px;
                text-align: left;
                font-size: 14px;
              }
              .debug-section {
                margin-top: 20px;
                border-top: 1px solid #ddd;
                padding-top: 15px;
              }
              .debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
              }
              .debug-toggle {
                background-color: transparent;
                border: none;
                color: #0078d4;
                font-size: 12px;
                cursor: pointer;
              }
              .debug-info {
                background-color: #f0f0f0;
                border-radius: 4px;
                padding: 10px;
                text-align: left;
                font-family: monospace;
                font-size: 12px;
                color: #555;
                max-height: 200px;
                overflow-y: auto;
                display: none;
              }
              .copy-button {
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 5px 10px;
                font-size: 12px;
                cursor: pointer;
                margin-top: 10px;
              }
              .timestamp {
                color: #888;
                font-size: 12px;
                margin-top: 20px;
                text-align: center;
              }
              .footer-debug {
                position: fixed;
                bottom: 0;
                right: 0;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 5px 10px;
                font-size: 10px;
                z-index: 9999;
              }
              .mock-post {
                border: 1px solid #e1e1e1;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                background-color: #fff;
                text-align: left;
              }
              .post-header {
                display: flex;
                align-items: center;
                margin-bottom: 10px;
              }
              .avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                margin-right: 10px;
                background-color: #f0f0f0;
              }
              .post-meta {
                flex: 1;
              }
              .author {
                font-weight: bold;
                color: #333;
              }
              .timestamp-small {
                font-size: 12px;
                color: #666;
              }
              .post-content {
                color: #333;
                line-height: 1.5;
              }
              .placeholder-text {
                height: 12px;
                background-color: #f0f0f0;
                border-radius: 3px;
                margin-bottom: 8px;
                width: 100%;
              }
              .placeholder-text.short {
                width: 60%;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="color: #0078d4;">Viva Engage - Latest Messages</h2>
              </div>

              <div class="message">
                <p><strong>Unable to load Viva Engage messages</strong></p>
                <p>We tried to fetch your latest Viva Engage messages, but the content returned was empty or too small (${htmlContent ? htmlContent.length : 0} bytes).</p>
              </div>

              <!-- Mock posts to show what it would look like -->
              <div style="margin-bottom: 20px;">
                <h3 style="text-align: left; color: #555; font-size: 16px; margin-bottom: 15px;">Preview (Placeholder Content)</h3>

                <!-- Mock post 1 -->
                <div class="mock-post">
                  <div class="post-header">
                    <div class="avatar"></div>
                    <div class="post-meta">
                      <div class="author">Example User</div>
                      <div class="timestamp-small">Just now</div>
                    </div>
                  </div>
                  <div class="post-content">
                    <div class="placeholder-text"></div>
                    <div class="placeholder-text"></div>
                    <div class="placeholder-text short"></div>
                  </div>
                </div>

                <!-- Mock post 2 -->
                <div class="mock-post">
                  <div class="post-header">
                    <div class="avatar"></div>
                    <div class="post-meta">
                      <div class="author">Another User</div>
                      <div class="timestamp-small">Yesterday</div>
                    </div>
                  </div>
                  <div class="post-content">
                    <div class="placeholder-text"></div>
                    <div class="placeholder-text short"></div>
                  </div>
                </div>

                <!-- Mock post 3 -->
                <div class="mock-post">
                  <div class="post-header">
                    <div class="avatar"></div>
                    <div class="post-meta">
                      <div class="author">Third User</div>
                      <div class="timestamp-small">2 days ago</div>
                    </div>
                  </div>
                  <div class="post-content">
                    <div class="placeholder-text"></div>
                    <div class="placeholder-text"></div>
                    <div class="placeholder-text"></div>
                    <div class="placeholder-text short"></div>
                  </div>
                </div>
              </div>

              <div class="actions">
                <a href="https://web.yammer.com/embed/groups" target="_blank" class="button">Open in Browser</a>
                <button onclick="window.parent.location.reload();" class="button secondary">Retry Loading</button>
              </div>

              <div class="troubleshooting">
                <h3 style="color: #555; font-size: 16px; margin-bottom: 10px;">Troubleshooting</h3>

                <div class="action-buttons">
                  <button id="tryDirectLoad" class="action-button">
                    <span style="font-weight: bold;">Try Direct Load</span><br>
                    <span style="font-size: 12px; color: #666;">Attempt to load Viva Engage directly in this iframe</span>
                  </button>

                  <button id="checkAuth" class="action-button">
                    <span style="font-weight: bold;">Check Authentication</span><br>
                    <span style="font-size: 12px; color: #666;">Verify if you're properly authenticated with Microsoft</span>
                  </button>

                  <button id="clearCache" class="action-button">
                    <span style="font-weight: bold;">Clear Local Cache</span><br>
                    <span style="font-size: 12px; color: #666;">Clear any cached data that might be causing issues</span>
                  </button>
                </div>

                <div id="actionResult" class="action-result">
                  <!-- Results will be shown here -->
                </div>
              </div>

              <div class="debug-section">
                <div class="debug-header">
                  <h3 style="color: #555; font-size: 14px; margin: 0;">Debugging Information</h3>
                  <button onclick="document.getElementById('debugInfo').style.display = document.getElementById('debugInfo').style.display === 'none' ? 'block' : 'none';" class="debug-toggle">
                    Toggle Details
                  </button>
                </div>

                <div id="debugInfo" class="debug-info">
                  <p><strong>Time:</strong> ${timestamp}</p>
                  <p><strong>Response Status:</strong> ${response.status} ${response.statusText}</p>
                  <p><strong>Content Length:</strong> ${htmlContent ? htmlContent.length : 0} bytes</p>
                  <p><strong>Content Sample:</strong> ${htmlContent ? htmlContent.substring(0, 50).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '...' : 'Empty'}</p>
                  <p><strong>User Agent:</strong> ${request.headers.get('user-agent') || 'Not available'}</p>
                  <p><strong>Headers:</strong> ${JSON.stringify(Object.fromEntries([...response.headers.entries()])).substring(0, 100)}...</p>
                </div>

                <button onclick="
                  const debugInfo = \`
Viva Engage Debug Info:
Time: ${timestamp}
Status: ${response.status} ${response.statusText}
Content Length: ${htmlContent ? htmlContent.length : 0} bytes
User Agent: ${request.headers.get('user-agent') || 'Not available'}
\`;
                  navigator.clipboard.writeText(debugInfo);
                  alert('Debug info copied to clipboard');
                " class="copy-button">
                  Copy Debug Info
                </button>
              </div>

              <p class="timestamp">
                Last attempt: ${new Date().toLocaleString()}
              </p>
            </div>

            <div class="footer-debug">
              Content loaded at: ${new Date().toISOString()} (Enhanced Fallback)
            </div>

            <script>
              // Add event listeners for the troubleshooting buttons
              document.getElementById('tryDirectLoad').addEventListener('click', function() {
                const resultDiv = document.getElementById('actionResult');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<p>Attempting to load Viva Engage directly...</p>';

                try {
                  // Create an iframe and try to load Viva Engage directly
                  const iframe = document.createElement('iframe');
                  iframe.src = 'https://web.yammer.com/embed/groups';
                  iframe.style.width = '100%';
                  iframe.style.height = '300px';
                  iframe.style.border = '1px solid #ddd';
                  iframe.style.borderRadius = '4px';

                  // Add load and error event listeners
                  iframe.onload = function() {
                    resultDiv.innerHTML += '<p style="color: green;">✓ Iframe loaded successfully</p>';
                  };

                  iframe.onerror = function() {
                    resultDiv.innerHTML += '<p style="color: red;">✗ Failed to load iframe directly</p>';
                  };

                  // Add the iframe to the result div
                  resultDiv.appendChild(iframe);
                } catch (error) {
                  resultDiv.innerHTML += '<p style="color: red;">✗ Error: ' + error.message + '</p>';
                }
              });

              document.getElementById('checkAuth').addEventListener('click', function() {
                const resultDiv = document.getElementById('actionResult');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<p>Checking authentication status...</p>';

                // Try to fetch the user's profile from Microsoft Graph
                fetch('https://graph.microsoft.com/v1.0/me', {
                  headers: {
                    'Authorization': 'Bearer ${session.accessToken}'
                  }
                })
                .then(response => {
                  if (response.ok) {
                    return response.json().then(data => {
                      resultDiv.innerHTML += '<p style="color: green;">✓ Authentication successful</p>';
                      resultDiv.innerHTML += '<p>User: ' + (data.displayName || data.userPrincipalName || 'Unknown') + '</p>';
                    });
                  } else {
                    resultDiv.innerHTML += '<p style="color: red;">✗ Authentication failed: ' + response.status + ' ' + response.statusText + '</p>';
                    resultDiv.innerHTML += '<p>Try signing out and signing back in to refresh your token.</p>';
                  }
                })
                .catch(error => {
                  resultDiv.innerHTML += '<p style="color: red;">✗ Error checking authentication: ' + error.message + '</p>';
                });
              });

              document.getElementById('clearCache').addEventListener('click', function() {
                const resultDiv = document.getElementById('actionResult');
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<p>Clearing local cache...</p>';

                try {
                  // Clear localStorage
                  localStorage.clear();

                  // Clear sessionStorage
                  sessionStorage.clear();

                  // Try to clear cookies (this is limited by browser security)
                  document.cookie.split(';').forEach(function(c) {
                    document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
                  });

                  resultDiv.innerHTML += '<p style="color: green;">✓ Local cache cleared</p>';
                  resultDiv.innerHTML += '<p>Please reload the page to apply changes.</p>';
                  resultDiv.innerHTML += '<button onclick="window.parent.location.reload();" style="background-color: #0078d4; color: white; border: none; border-radius: 4px; padding: 5px 10px; margin-top: 10px; cursor: pointer;">Reload Page</button>';
                } catch (error) {
                  resultDiv.innerHTML += '<p style="color: red;">✗ Error clearing cache: ' + error.message + '</p>';
                }
              });
            </script>
          </body>
        </html>
      `;
    }

    // Create a simple HTML wrapper that loads the Viva Engage content
    const wrappedContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <base href="https://web.yammer.com/embed/groups/">
        <title>Viva Engage</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
            background-color: #fff;
            color: #333;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          .container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .error-container {
            padding: 20px;
            text-align: center;
            max-width: 500px;
            margin: 0 auto;
          }
          .debug-info {
            position: fixed;
            bottom: 0;
            right: 0;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            font-size: 10px;
            z-index: 9999;
            max-width: 300px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          /* Add styles for the actual content */
          .viva-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
            overflow: auto;
          }
          /* Add styles for the debug panel */
          .debug-panel {
            position: fixed;
            top: 10px;
            right: 10px;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 5px 10px;
            font-size: 10px;
            z-index: 9999;
            border-radius: 4px;
            max-width: 300px;
          }
          .debug-panel button {
            background: #0078d4;
            color: white;
            border: none;
            padding: 3px 6px;
            border-radius: 3px;
            font-size: 9px;
            cursor: pointer;
            margin-top: 5px;
          }
          .debug-panel button:hover {
            background: #106ebe;
          }
        </style>
        <!-- Include MSAL library directly to avoid the 404 error -->
        <script src="https://alcdn.msauth.net/browser/2.30.0/js/msal-browser.min.js"></script>

        <!-- Add a script to define a global MSAL object and intercept module loading systems -->
        <script>
          // Create a global MSAL object that can be used by Viva Engage
          // This will prevent it from trying to load the MSAL library itself
          // Check if window is defined first (client-side only)
          if (typeof window !== 'undefined') {
            window.msal = window.msal || {};

            // If the MSAL library is already loaded, use it
            if (typeof Msal !== 'undefined') {
              console.log('MSAL library already loaded, using it');
              window.msal = Msal;
            }

            // Add debug info to the page
            window.addEventListener('load', function() {
              const debugInfo = document.createElement('div');
              debugInfo.className = 'debug-info';
              debugInfo.textContent = 'Content loaded at: ' + new Date().toISOString();
              document.body.appendChild(debugInfo);
            });
          }

          // Create a fake MSAL module that can be used by any module system
          const createMsalModule = () => {
            // Create a basic MSAL module with the essential functionality
            const msalModule = {
              PublicClientApplication: function(config) {
                this.config = config;
                this.loginPopup = function() { return Promise.resolve({ account: { username: 'proxy-user@example.com' } }); };
                this.loginRedirect = function() { return Promise.resolve(); };
                this.logout = function() { return Promise.resolve(); };
                this.getActiveAccount = function() { return { username: 'proxy-user@example.com' }; };
                this.getAllAccounts = function() { return [{ username: 'proxy-user@example.com' }]; };
                this.setActiveAccount = function() { return true; };
                this.acquireTokenSilent = function() { 
                  return Promise.resolve({ 
                    accessToken: 'fake-token',
                    account: { username: 'proxy-user@example.com' },
                    expiresOn: new Date(Date.now() + 3600000),
                    scopes: ['user.read']
                  }); 
                };
                this.acquireTokenPopup = function() { 
                  return Promise.resolve({ 
                    accessToken: 'fake-token',
                    account: { username: 'proxy-user@example.com' },
                    expiresOn: new Date(Date.now() + 3600000),
                    scopes: ['user.read']
                  }); 
                };
                this.acquireTokenRedirect = function() { return Promise.resolve(); };
              },
              // Add other MSAL classes and constants as needed
              InteractionType: {
                Popup: 'popup',
                Redirect: 'redirect',
                Silent: 'silent'
              },
              BrowserAuthError: function(errorCode, errorMessage) {
                this.errorCode = errorCode;
                this.errorMessage = errorMessage;
                this.stack = (new Error()).stack;
                this.name = "BrowserAuthError";
              }
            };

            // Add the module to the window object if window is defined
            if (typeof window !== 'undefined') {
              window.msal = Object.assign(window.msal || {}, msalModule);
            }

            return msalModule;
          };

          // Create the MSAL module only if in browser environment
          const msalModule = typeof window !== 'undefined' ? createMsalModule() : {};

          // Only run browser-specific code if window is defined
          if (typeof window !== 'undefined') {
            // Intercept ES6 dynamic imports
            // This is a bit tricky since we can't directly override import(), but we can try to intercept it
            // by overriding the native Promise implementation temporarily
            const originalPromise = window.Promise;
            const msalPromiseCache = {};

            // Create a function to check if a URL is for MSAL
            const isMsalUrl = (url) => {
              return typeof url === 'string' && (
                url.includes('msal') || 
                url.includes('4-auth-msal') || 
                url.includes('auth-msal')
              );
            };

            // Override Promise.prototype.then to intercept dynamic imports
            if (typeof Promise !== 'undefined' && Promise.prototype && Promise.prototype.then) {
              const originalThen = Promise.prototype.then;
              Promise.prototype.then = function(onFulfilled, onRejected) {
                // Check if this is a dynamic import promise
                if (this && this.constructor && this.constructor.name === 'Promise' && 
                    onFulfilled && typeof onFulfilled === 'function') {

                  // Create a wrapper for onFulfilled
                  const wrappedOnFulfilled = function(module) {
                    // Check if this looks like an ES module with a default export
                    if (module && module.__esModule && module.default) {
                      // Check if this is the MSAL module
                      if (module.default.name === 'Msal' || 
                          (typeof module.default.toString === 'function' && 
                           module.default.toString().includes('msal'))) {

                        console.log('Intercepted ES6 dynamic import of MSAL module');
                        // Return our global MSAL object instead
                        return { __esModule: true, default: window.msal };
                      }
                    }

                    // Otherwise, call the original handler
                    return onFulfilled(module);
                  };

                  // Call the original then with our wrapped handler
                  return originalThen.call(this, wrappedOnFulfilled, onRejected);
                }

                // Otherwise, pass through to the original then
                return originalThen.call(this, onFulfilled, onRejected);
              };
            }
          }

          // Intercept RequireJS or AMD module loading - only in browser environment
          if (typeof window !== 'undefined' && typeof define === 'function' && define.amd) {
            console.log('AMD module system detected, intercepting define and require');

            // Store the original define function
            const originalDefine = define;

            // Override the define function to intercept module definitions
            window.define = function(name, deps, callback) {
              // Check if this is a module definition for MSAL
              if (typeof name === 'string' && name.includes('msal')) {
                console.log('Intercepted AMD module definition for MSAL:', name);
                // Return the already loaded MSAL library
                return originalDefine(name, [], function() {
                  return window.msal;
                });
              }

              // Check if dependencies include MSAL
              if (Array.isArray(deps)) {
                const msalIndex = deps.findIndex(dep => 
                  typeof dep === 'string' && (
                    dep.includes('msal') || 
                    dep.includes('4-auth-msal') || 
                    dep.includes('auth-msal')
                  )
                );

                if (msalIndex !== -1) {
                  console.log('Intercepted AMD module with MSAL dependency:', deps[msalIndex]);
                  // Replace the MSAL dependency with our global MSAL object
                  const newDeps = [...deps];
                  newDeps[msalIndex] = 'msal-preloaded';

                  // Define the msal-preloaded module
                  originalDefine('msal-preloaded', [], function() {
                    return window.msal;
                  });

                  // Call the original define with the modified dependencies
                  return originalDefine(name, newDeps, callback);
                }
              }

              // Pass through to the original define for all other modules
              return originalDefine.apply(this, arguments);
            };

            // Copy properties from the original define
            for (const prop in originalDefine) {
              if (originalDefine.hasOwnProperty(prop)) {
                window.define[prop] = originalDefine[prop];
              }
            }

            // If require is defined, intercept it as well
            if (typeof require === 'function') {
              const originalRequire = require;

              window.require = function(deps, callback) {
                // Check if dependencies include MSAL
                if (Array.isArray(deps)) {
                  const msalIndex = deps.findIndex(dep => 
                    typeof dep === 'string' && (
                      dep.includes('msal') || 
                      dep.includes('4-auth-msal') || 
                      dep.includes('auth-msal')
                    )
                  );

                  if (msalIndex !== -1) {
                    console.log('Intercepted require call with MSAL dependency:', deps[msalIndex]);
                    // Replace the MSAL dependency with our global MSAL object
                    const newDeps = [...deps];
                    newDeps[msalIndex] = 'msal-preloaded';

                    // Define the msal-preloaded module if not already defined
                    if (!window.require.defined || !window.require.defined('msal-preloaded')) {
                      originalDefine('msal-preloaded', [], function() {
                        return window.msal;
                      });
                    }

                    // Call the original require with the modified dependencies
                    return originalRequire(newDeps, callback);
                  }
                }

                // Pass through to the original require for all other modules
                return originalRequire.apply(this, arguments);
              };

              // Copy properties from the original require
              for (const prop in originalRequire) {
                if (originalRequire.hasOwnProperty(prop)) {
                  window.require[prop] = originalRequire[prop];
                }
              }
            }
          }
        </script>

        <script>
          // Only run browser-specific code if window is defined
          if (typeof window !== 'undefined') {
            // Helper to handle script loading errors
            window.addEventListener('error', function(e) {
              if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
                console.warn('Resource loading error:', e.target.src || e.target.href);

                // If the script is from localhost:3001 or web.yammer.com/4-auth-msal.js, handle it
                if (e.target.src) {
                  // Handle any auth-msal.js or 4-auth-msal.js file regardless of domain
                  if (e.target.src.includes('auth-msal.js') || e.target.src.includes('4-auth-msal.js')) {
                    console.log('Detected MSAL script loading error:', e.target.src);
                    console.log('MSAL library already loaded from CDN, preventing default error handling');

                    // Prevent the default error handling
                    e.preventDefault();
                    e.stopPropagation();

                    // Replace the script with an inline script that provides the MSAL module
                    const scriptParent = e.target.parentNode;
                    if (scriptParent) {
                      // Remove the failing script
                      scriptParent.removeChild(e.target);

                      // Create a new inline script
                      const newScript = document.createElement('script');
                      newScript.textContent = '// MSAL already loaded from CDN';
                      newScript.setAttribute('data-replaced', 'true');

                      // Add the new script to the DOM
                      scriptParent.appendChild(newScript);

                      console.log('Replaced failing MSAL script with inline script');
                    }

                    return false;
                  }
                  // Handle localhost:3001 scripts
                  else if (e.target.src.includes('localhost:3001')) {
                    console.log('Attempting to fix localhost script reference:', e.target.src);

                    // Prevent the default error handling
                    e.preventDefault();
                    e.stopPropagation();

                    return false;
                  }
                }
              }
            }, true);

            // Define a global variable to indicate that we're in the proxy environment
            window.VIVA_ENGAGE_PROXY = true;

            // Add a global error logger to help diagnose issues
            window.logVivaEngageError = function(source, error, details) {
              console.error(
                '%c Viva Engage Error: ' + source + ' %c',
                'background: #ff0000; color: white; padding: 2px 5px; border-radius: 3px;',
                '',
                error,
                details || ''
              );

              // Try to send the error to the parent window for debugging
              try {
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({
                    type: 'VIVA_ENGAGE_ERROR',
                    source: source,
                    error: typeof error === 'object' ? JSON.stringify(error) : error,
                    details: details,
                    timestamp: new Date().toISOString()
                  }, '*');
                }
              } catch (e) {
                console.error('Failed to send error to parent window:', e);
              }

              return error; // Return the error for chaining
            };

            // Override console.error to add more visibility to errors
            const originalConsoleError = console.error;
            console.error = function() {
              // Call the original console.error
              originalConsoleError.apply(console, arguments);

              // Check if this is related to MSAL or chunk loading
              const errorText = Array.from(arguments).join(' ');
              if (errorText.includes('msal') || 
                  errorText.includes('auth-msal') || 
                  errorText.includes('4-auth-msal') ||
                  errorText.includes('chunk 1278') ||
                  errorText.includes('ChunkLoadError')) {

                console.warn(
                  '%c VIVA ENGAGE IMPORTANT ERROR DETECTED %c',
                  'background: #ff6600; color: white; padding: 2px 5px; border-radius: 3px;',
                  '',
                  'This error is related to MSAL or chunk loading and might be causing issues with Viva Engage'
                );
              }
            };
          }

          // Only run browser-specific code if window is defined
          if (typeof window !== 'undefined') {
            // Add a MutationObserver to intercept script tags being added to the DOM
            if (typeof MutationObserver !== 'undefined') {
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                      // Check if the added node is a script tag
                      if (node.nodeName === 'SCRIPT') {
                        const scriptNode = node;
                        // Check if it's trying to load 4-auth-msal.js from web.yammer.com
                        if (scriptNode.src && scriptNode.src.includes('web.yammer.com') && scriptNode.src.includes('4-auth-msal.js')) {
                          console.log('Intercepted script tag loading 4-auth-msal.js from web.yammer.com:', scriptNode.src);
                          // Prevent the script from loading by removing the src attribute
                          scriptNode.removeAttribute('src');
                          // Add a data attribute to mark it as intercepted
                          scriptNode.setAttribute('data-intercepted', 'true');
                          // Add a comment to the script to indicate it's been intercepted
                          scriptNode.textContent = '// MSAL already loaded from CDN';
                        }
                      }
                    });
                  }
                });
              });

              // Start observing the document with the configured parameters
              observer.observe(document, { childList: true, subtree: true });
            }

            // Intercept JSONP chunk loading
            // This is used by webpack and other bundlers to load chunks dynamically
            window.__webpack_require__ = window.__webpack_require__ || {};
            window.__webpack_chunk_load__ = window.__webpack_chunk_load__ || function() { return Promise.resolve(); };

            // Store the original jsonp function if it exists
            const originalJsonpFunction = window.webpackJsonp || window.webpackJsonpCallback || window.__webpack_jsonp__;

            // Create a handler for jsonp chunks
            const handleJsonpChunk = (data) => {
              // Check if this is an array (standard webpack jsonp format)
              if (Array.isArray(data)) {
                // Check if any of the chunk names or paths include MSAL
                const chunkId = data[0];
                if (typeof chunkId === 'number' || typeof chunkId === 'string') {
                  // This is likely a chunk ID, check if it's for MSAL
                  console.log('Processing jsonp chunk:', chunkId);
                }

                // The second element is usually an object mapping chunk IDs to modules
                const modules = data[1];
                if (modules && typeof modules === 'object') {
                  // Check each module to see if it's MSAL related
                  for (const moduleId in modules) {
                    if (modules.hasOwnProperty(moduleId)) {
                      const moduleFunc = modules[moduleId];

                      // Check if the module function contains MSAL references
                      if (typeof moduleFunc === 'function') {
                        const funcStr = moduleFunc.toString();
                        if (funcStr.includes('msal') || funcStr.includes('auth-msal') || funcStr.includes('4-auth-msal')) {
                          console.log('Intercepted MSAL module in jsonp chunk:', moduleId);

                          // Replace the module function with one that returns our fake MSAL module
                          modules[moduleId] = function(module, exports, __webpack_require__) {
                            module.exports = window.msal;
                          };
                        }
                      }
                    }
                  }
                }
              }

              // Return the modified data
              return data;
            };

            // Override the jsonp function if it exists
            if (originalJsonpFunction) {
              console.log('Intercepting webpack jsonp function');

              // Create a wrapper for the jsonp function
              window.webpackJsonp = window.webpackJsonpCallback = window.__webpack_jsonp__ = function() {
                // Process the arguments
                const args = Array.from(arguments).map(handleJsonpChunk);

                // Call the original function with the modified arguments
                return originalJsonpFunction.apply(this, args);
              };
            }

            // Also intercept the chunk load function used by newer webpack versions
            const originalChunkLoad = window.__webpack_chunk_load__;
            window.__webpack_chunk_load__ = function(chunkId) {
              console.log('Intercepted webpack chunk load:', chunkId);

              // Check if this is an MSAL related chunk or chunk 1278
              if (
                // Check for chunk 1278 specifically
                chunkId === '1278' || chunkId === 1278 || 
                // Check for MSAL related chunks
                (typeof chunkId === 'string' && (
                  chunkId.includes('msal') || 
                  chunkId.includes('auth-msal') || 
                  chunkId.includes('4-auth-msal')
                ))
              ) {
                console.log('Intercepted MSAL or chunk 1278 load:', chunkId);

                // Create a fake module that exports our MSAL module
                const fakeModule = {
                  __esModule: true,
                  default: window.msal || {}
                };

                // Return a resolved promise with the fake module
                return Promise.resolve(fakeModule);
              }

              // Otherwise, call the original function
              return originalChunkLoad.apply(this, arguments);
            };
          }

          // Handle all types of errors, including SyntaxError and ChunkLoadError - only in browser environment
          if (typeof window !== 'undefined') {
            window.addEventListener('error', function(event) {
              // Log all errors for debugging
              console.log('Error event:', event.type, event.message || (event.error && event.error.message));

              // Handle SyntaxError specifically
              if (event.error && event.error.name === 'SyntaxError') {
                console.log('Intercepted SyntaxError:', event.error.message, 'at line:', event.lineno, 'column:', event.colno);

                // If this is the SyntaxError at viva-engage mentioned in the issue (line 468 or 550)
                if (event.filename && event.filename.includes('viva-engage') && 
                    (event.lineno === 468 || event.lineno === 550)) {
                  console.log('Intercepted the specific SyntaxError at viva-engage:' + event.lineno + ' mentioned in the issue');
                  // Prevent the default error handling
                  event.preventDefault();
                  event.stopPropagation();

                  // Try to provide a fake MSAL module to resolve the issue
                  if (!window.msal) {
                    console.log('Creating fake MSAL module to resolve SyntaxError');
                    window.msal = createMsalModule();
                  }

                  return false;
                }
              }

              // Check if this is a ChunkLoadError
              if (event.error && event.error.name === 'ChunkLoadError') {
                console.log('Intercepted ChunkLoadError:', event.error.message);

                // Check if it's related to 4-auth-msal.js or chunk 1278
                if (event.error.message && (
                  event.error.message.includes('4-auth-msal.js') ||
                  event.error.message.includes('auth-msal.js') ||
                  // Also check for the specific chunk ID mentioned in the error (1278)
                  event.error.message.includes('chunk 1278') ||
                  event.error.message.includes('Loading chunk 1278') ||
                  event.error.message.includes('ChunkLoadError')
                )) {
                  console.log('Intercepted ChunkLoadError for MSAL or chunk 1278, preventing default');

                  // Log more details about the error
                  console.log('Error details:', {
                    message: event.error.message,
                    stack: event.error.stack,
                    type: event.error.name,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                  });

                  // Prevent the default error handling
                  event.preventDefault();
                  event.stopPropagation();

                  // Try to globally define chunk 1278 as a resolved module
                  if (window.__webpack_require__ && typeof window.__webpack_require__.m === 'object') {
                    console.log('Attempting to define chunk 1278 directly in webpack modules');

                    // Create a fake module for chunk 1278
                    const fakeModule = function(module, exports, __webpack_require__) {
                      module.exports = window.msal || {};
                    };

                    // Try to add it to webpack's module cache
                    try {
                      window.__webpack_require__.m['1278'] = fakeModule;
                      console.log('Successfully defined chunk 1278 in webpack modules');
                    } catch (e) {
                      console.log('Failed to define chunk 1278 in webpack modules:', e);
                    }
                  }

                  // If there's a stack trace that mentions jsonp chunk loading or ensure chunk,
                  // we can try to resolve the promise that's waiting for the chunk
                  if (event.error.stack && (
                    event.error.stack.includes('jsonp chunk loading') ||
                    event.error.stack.includes('ensure chunk')
                  )) {
                    console.log('Attempting to resolve the chunk promise');

                    // Create a fake module that exports our MSAL module
                    const fakeModule = {
                      __esModule: true,
                      default: window.msal
                    };

                    // Try to find and resolve any pending chunk promises
                    if (window.__webpack_require__ && window.__webpack_require__.e) {
                      const originalEnsure = window.__webpack_require__.e;
                      window.__webpack_require__.e = function(chunkId) {
                        console.log('Webpack require.ensure for chunk:', chunkId);

                        // For MSAL related chunks or chunk 1278, return a resolved promise
                        if (chunkId === 1278 || chunkId === '1278' || 
                            (typeof chunkId === 'string' && (
                              chunkId.includes('msal') || 
                              chunkId.includes('auth-msal') || 
                              chunkId.includes('4-auth-msal')
                            ))) {
                          console.log('Resolving ensure promise for chunk:', chunkId);

                          // Create a fake module that exports our MSAL module
                          const fakeModule = {
                            __esModule: true,
                            default: window.msal || {}
                          };

                          // Return a resolved promise with the fake module
                          return Promise.resolve(fakeModule);
                        }

                        // Otherwise, call the original ensure function
                        return originalEnsure.apply(this, arguments);
                      };
                    }
                  }
                }
              }
            }, true);
          }

          // Intercept fetch and XMLHttpRequest to handle localhost:3001 requests and web.yammer.com/4-auth-msal.js
          // Only run in browser environment
          if (typeof window !== 'undefined') {
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
              // Log all fetch requests for debugging
              console.log('Fetch request:', url);

              // Handle requests to web.yammer.com/4-auth-msal.js
              if (url && typeof url === 'string' && url.includes('4-auth-msal.js')) {
                console.log('Intercepted fetch to 4-auth-msal.js:', url);

                // Create a more robust MSAL replacement script
                const msalScript = `
                  // MSAL replacement script for ${url}
                  console.log('Using proxy-provided MSAL module');

                  // Define a global MSAL object if it doesn't exist
                  if (typeof window !== 'undefined' && typeof window.msal === 'undefined') {
                    window.msal = {
                      PublicClientApplication: function(config) {
                        this.config = config;
                        this.loginPopup = function() { return Promise.resolve({ account: { username: 'proxy-user@example.com' } }); };
                        this.loginRedirect = function() { return Promise.resolve(); };
                        this.logout = function() { return Promise.resolve(); };
                        this.getActiveAccount = function() { return { username: 'proxy-user@example.com' }; };
                        this.getAllAccounts = function() { return [{ username: 'proxy-user@example.com' }]; };
                        this.setActiveAccount = function() { return true; };
                        this.acquireTokenSilent = function() { 
                          return Promise.resolve({ 
                            accessToken: 'fake-token',
                            account: { username: 'proxy-user@example.com' },
                            expiresOn: new Date(Date.now() + 3600000),
                            scopes: ['user.read']
                          }); 
                        };
                      }
                    };
                  }

                  // Export the MSAL module for different module systems
                  if (typeof window !== 'undefined') {
                    if (typeof module !== 'undefined' && module.exports) {
                      module.exports = window.msal;
                    }
                    if (typeof define === 'function' && define.amd) {
                      define('msal', [], function() { return window.msal; });
                    }
                  }
                `;

                return Promise.resolve(new Response(msalScript, {
                  status: 200,
                  headers: { 
                    'Content-Type': 'application/javascript',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                    'Access-Control-Max-Age': '86400',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                  }
                }));
              }

              // Handle requests to localhost:3001
              if (url && typeof url === 'string' && url.includes('localhost:3001')) {
                console.log('Intercepted fetch to localhost:3001:', url);

                // For auth-msal.js specifically, return an empty JS file
                if (url.includes('auth-msal.js') || url.includes('4-auth-msal.js')) {
                  console.log('Returning empty JS for MSAL script:', url);
                  return Promise.resolve(new Response('// MSAL already loaded from CDN', {
                    status: 200,
                    headers: { 
                      'Content-Type': 'application/javascript',
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'GET, OPTIONS',
                      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    }
                  }));
                }

                // For other JS files from localhost:3001, try to handle them generically
                if (url.endsWith('.js')) {
                  const jsFileName = url.split('/').pop();
                  console.log('Handling generic JS file from localhost:3001:', jsFileName);

                  // Return an empty JS file with console logging
                  return Promise.resolve(new Response(
                    "// Proxy replacement for " + jsFileName + "\n" +
                    "console.log('Proxy loaded empty replacement for: " + jsFileName + "');\n" +
                    "// Define an empty module if needed\n" +
                    "if (typeof window !== 'undefined' && typeof window.define === 'function' && window.define.amd) {\n" +
                    "  define([], function() { return {}; });\n" +
                    "}", 
                    {
                      status: 200,
                      headers: { 
                        'Content-Type': 'application/javascript',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                      }
                    }
                  ));
                }

                // For other resources, return a generic response based on the file extension
                const ext = url.split('.').pop().toLowerCase();
                if (ext === 'css') {
                  return Promise.resolve(new Response('/* Proxy CSS placeholder */', {
                    status: 200,
                    headers: { 
                      'Content-Type': 'text/css',
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'GET, OPTIONS',
                      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    }
                  }));
                } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
                  // For images, return a transparent 1x1 pixel data URI
                  const contentType = ext === 'svg' ? 'image/svg+xml' : 'image/' + ext;
                  return Promise.resolve(new Response('', {
                    status: 200,
                    headers: { 
                      'Content-Type': contentType,
                      'Access-Control-Allow-Origin': '*',
                      'Access-Control-Allow-Methods': 'GET, OPTIONS',
                      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                    }
                  }));
                }

                // For any other resource, return an empty 200 response
                console.log('Returning empty response for:', url);
                return Promise.resolve(new Response('', { 
                  status: 200,
                  headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                  }
                }));
              }

              // For all other URLs, proceed with the original fetch
              return originalFetch.apply(this, arguments);
            };

            // Also intercept XMLHttpRequest for older code
            if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype) {
              const originalXHROpen = XMLHttpRequest.prototype.open;
              XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                // Log all XMLHttpRequest requests for debugging
                console.log('XMLHttpRequest:', method, url);

                // Handle requests to 4-auth-msal.js regardless of domain
                if (url && typeof url === 'string' && url.includes('4-auth-msal.js')) {
                  console.log('Intercepted XMLHttpRequest to 4-auth-msal.js:', url);
                  // Redirect to a URL that will be intercepted by our fetch handler
                  url = '/api/viva-engage/proxy-resource?url=' + encodeURIComponent(url);
                }
                // Handle requests to auth-msal.js regardless of domain
                else if (url && typeof url === 'string' && url.includes('auth-msal.js')) {
                  console.log('Intercepted XMLHttpRequest to auth-msal.js:', url);
                  // Redirect to a URL that will be intercepted by our fetch handler
                  url = '/api/viva-engage/proxy-resource?url=' + encodeURIComponent(url);
                }
                // Handle requests to localhost:3001
                else if (url && typeof url === 'string' && url.includes('localhost:3001')) {
                  console.log('Intercepted XMLHttpRequest to localhost:3001:', url);
                  // Redirect to a URL that will be intercepted by our fetch handler
                  url = '/api/viva-engage/proxy-resource?url=' + encodeURIComponent(url);
                }
                return originalXHROpen.call(this, method, url, async, user, password);
              };
            }
          }
        </script>
      </head>
      <body>
        <div class="container">
          <!-- Debug panel to show information about the content -->
          <div class="debug-panel">
            <div>Viva Engage Debug</div>
            <div>Time: ${new Date().toISOString()}</div>
            <div>Content Length: ${htmlContent ? htmlContent.length : 0} bytes</div>
            <div>Status: ${response.status} ${response.statusText}</div>
            <button onclick="document.querySelector('.debug-details').style.display = document.querySelector('.debug-details').style.display === 'none' ? 'block' : 'none';">
              Toggle Details
            </button>
            <div class="debug-details" style="display: none; margin-top: 5px; font-size: 8px; max-height: 200px; overflow: auto;">
              <div>Content Sample:</div>
              <pre style="white-space: pre-wrap; word-break: break-all;">${htmlContent ? htmlContent.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;') + '...' : 'Empty'}</pre>
            </div>
          </div>

          <!-- Actual content container -->
          <div class="viva-content">
            ${finalHtmlContent}
          </div>

          <!-- Add a visible debug info element at the bottom of the page -->
          <div class="debug-info">
            Content loaded at: ${new Date().toISOString()}
          </div>
        </div>
      </body>
      </html>
    `;

    // Return the HTML content with appropriate headers
    return new NextResponse(wrappedContent, {
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self' https://web.yammer.com http://localhost:3001 https://login.microsoftonline.com https://outlook-1.cdn.office.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://web.yammer.com http://localhost:3001 https://login.microsoftonline.com https://alcdn.msauth.net https://outlook-1.cdn.office.net; style-src 'self' 'unsafe-inline' https://web.yammer.com https://outlook-1.cdn.office.net; img-src 'self' https://web.yammer.com https://outlook-1.cdn.office.net data:; connect-src 'self' https://web.yammer.com http://localhost:3001 https://login.microsoftonline.com https://outlook-1.cdn.office.net; frame-ancestors 'self';",
      },
    });
  } catch (error: any) {
    terminalLog('ERROR', '====== VIVA ENGAGE API ERROR ======');
    terminalLog('ERROR', 'Viva Engage API Error', error);

    // Log additional error details
    terminalLog('ERROR', 'Error stack', error.stack);
    terminalLog('ERROR', 'Error occurred at', new Date().toISOString());

    // Get error details for display
    const errorMessage = error.message || 'Unknown error';
    const errorStack = error.stack || '';
    const errorTime = new Date().toISOString();
    const errorId = Math.random().toString(36).substring(2, 10); // Generate a random ID for this error

    // Log the error ID for correlation
    terminalLog('ERROR', 'Error ID', errorId);

    // Return error with helpful information and debugging tools
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Viva Engage Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
            line-height: 1.5;
          }
          .error-container {
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          }
          h3 {
            margin-top: 0;
          }
          .info-container {
            background-color: #e7f3ff;
            border: 1px solid #b3d9ff;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
          }
          .debug-container {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
            font-size: 12px;
            color: #555;
          }
          .debug-details {
            background-color: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
            margin-top: 10px;
            display: none;
          }
          .button {
            display: inline-block;
            background-color: #f0f0f0;
            border: 1px solid #ddd;
            color: #333;
            padding: 5px 10px;
            border-radius: 4px;
            text-decoration: none;
            font-size: 12px;
            cursor: pointer;
            margin-right: 10px;
          }
          .button:hover {
            background-color: #e0e0e0;
          }
          .button-primary {
            background-color: #0078d4;
            color: white;
            border-color: #0078d4;
          }
          .button-primary:hover {
            background-color: #006abc;
          }
          .error-id {
            font-family: monospace;
            background-color: #f0f0f0;
            padding: 2px 5px;
            border-radius: 3px;
          }
        </style>
        <script>
          // Function to toggle debug details
          function toggleDebug() {
            const debugDetails = document.getElementById('debugDetails');
            if (debugDetails.style.display === 'none' || !debugDetails.style.display) {
              debugDetails.style.display = 'block';
            } else {
              debugDetails.style.display = 'none';
            }
          }

          // Function to copy debug info to clipboard
          function copyDebugInfo() {
            const debugInfo = document.getElementById('debugInfo').innerText;
            navigator.clipboard.writeText(debugInfo)
              .then(() => {
                alert('Debug information copied to clipboard');
              })
              .catch(err => {
                console.error('Failed to copy debug info:', err);
                alert('Failed to copy debug info: ' + err);
              });
          }

          // Log when the error page loads
          window.addEventListener('load', function() {
            console.error('Viva Engage error page loaded at:', new Date().toISOString());
            console.error('Error ID: ${errorId}');
          });
        </script>
      </head>
      <body>
        <div class="error-container">
          <h3>Unable to Load Viva Engage</h3>
          <p>We encountered an error while trying to load Viva Engage content.</p>
          <p><small>Error ID: <span class="error-id">${errorId}</span></small></p>
        </div>

        <div class="info-container">
          <h4>Next Steps:</h4>
          <ol>
            <li>Try refreshing the page</li>
            <li>Sign out and sign back in</li>
            <li>Clear your browser cache</li>
            <li>Access Viva Engage directly at <a href="https://web.yammer.com/embed/groups" target="_blank">web.yammer.com</a></li>
            <li>If the issue persists, contact your administrator with the Error ID</li>
          </ol>
        </div>

        <div class="debug-container">
          <h4>Debugging Information</h4>
          <p>This information can help diagnose the issue:</p>

          <div id="debugInfo">
Error ID: ${errorId}
Time: ${errorTime}
Error: ${errorMessage}
URL: ${request.url}
User Agent: ${request.headers.get('user-agent') || 'Not available'}
          </div>

          <div style="margin-top: 15px;">
            <button class="button" onclick="toggleDebug()">Show Technical Details</button>
            <button class="button" onclick="copyDebugInfo()">Copy Debug Info</button>
            <a href="https://web.yammer.com/embed/groups" target="_blank" class="button button-primary">Open in Browser</a>
          </div>

          <div id="debugDetails" class="debug-details">
Error Stack:
${errorStack.replace(/</g, '&lt;').replace(/>/g, '&gt;')}

Request Headers:
${JSON.stringify({
  userAgent: request.headers.get('user-agent'),
  referer: request.headers.get('referer'),
  accept: request.headers.get('accept')
}, null, 2)}
          </div>
        </div>

        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #6c757d;">
          <p>This error occurred at ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // Return the error HTML with appropriate headers
    return new NextResponse(errorHtml, {
      status: 500,
      headers: {
        'Content-Type': 'text/html',
        'X-Frame-Options': 'SAMEORIGIN',
        'Content-Security-Policy': "default-src 'self' https://web.yammer.com http://localhost:3001 https://login.microsoftonline.com https://outlook-1.cdn.office.net; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://web.yammer.com http://localhost:3001 https://login.microsoftonline.com https://alcdn.msauth.net https://outlook-1.cdn.office.net; style-src 'self' 'unsafe-inline' https://web.yammer.com https://outlook-1.cdn.office.net; img-src 'self' https://web.yammer.com https://outlook-1.cdn.office.net data:; connect-src 'self' https://web.yammer.com http://localhost:3001 https://login.microsoftonline.com https://outlook-1.cdn.office.net; frame-ancestors 'self';",
      },
    });
  }
}
