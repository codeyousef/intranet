import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Store API key securely in environment variable
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

if (!WEATHER_API_KEY) {
  console.error('Weather API key not found in environment variables');
}

export interface WeatherData {
    location: {
        name: string;
        region: string;
        country: string;
    };
    current: {
        temp_c: number;
        condition: {
            text: string;
            icon: string;
        };
    };
}

export async function POST(request: NextRequest) {
  console.log('[WEATHER-API] Weather API route called');

  try {
    // Check if user is authenticated
    console.log('[WEATHER-API] Checking authentication');
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.log('[WEATHER-API] Authentication failed - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[WEATHER-API] Authenticated as:', session.user.email);

    // Check if API key is available
    if (!WEATHER_API_KEY) {
      console.error('[WEATHER-API] Weather API key not found in environment variables');
      return NextResponse.json({ 
        error: 'Weather service is not configured. Please contact administrator.',
        errorType: 'Configuration'
      }, { status: 503 });
    }

    console.log('[WEATHER-API] API key available, length:', WEATHER_API_KEY.length);

    // Parse request body
    console.log('[WEATHER-API] Parsing request body');
    let latitude, longitude;

    try {
      const body = await request.json();
      latitude = body.latitude;
      longitude = body.longitude;
      console.log('[WEATHER-API] Received coordinates:', latitude, longitude);
    } catch (parseError) {
      console.error('[WEATHER-API] Error parsing request body:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request format', 
        errorType: 'RequestFormat',
        details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
      }, { status: 400 });
    }

    if (!latitude || !longitude) {
      console.log('[WEATHER-API] Missing coordinates, received:', { latitude, longitude });
      return NextResponse.json({ 
        error: 'Latitude and longitude are required',
        errorType: 'MissingParameters'
      }, { status: 400 });
    }

    // Fetch weather data from WeatherAPI
    console.log('[WEATHER-API] Fetching weather data for coordinates:', latitude, longitude);
    const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=no`;
    console.log('[WEATHER-API] Request URL (redacted key):', apiUrl.replace(WEATHER_API_KEY, 'REDACTED'));

    try {
      const response = await fetch(apiUrl);
      console.log('[WEATHER-API] Response status:', response.status);

      if (!response.ok) {
        console.warn('[WEATHER-API] Primary location request failed, status:', response.status);
        console.warn('[WEATHER-API] Response text:', await response.text());

        // If location-based weather fails, fallback to Jeddah
        console.log('[WEATHER-API] Trying fallback to Jeddah coordinates');
        const fallbackUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=21.543333,39.172778&aqi=no`;
        console.log('[WEATHER-API] Fallback URL (redacted key):', fallbackUrl.replace(WEATHER_API_KEY, 'REDACTED'));

        const fallbackResponse = await fetch(fallbackUrl);
        console.log('[WEATHER-API] Fallback response status:', fallbackResponse.status);

        if (!fallbackResponse.ok) {
          console.error('[WEATHER-API] Fallback request also failed, status:', fallbackResponse.status);
          console.error('[WEATHER-API] Fallback response text:', await fallbackResponse.text());
          throw new Error(`Failed to fetch weather data, status: ${fallbackResponse.status}`);
        }

        const fallbackData: WeatherData = await fallbackResponse.json();
        console.log('[WEATHER-API] Successfully fetched fallback data for Jeddah');

        return NextResponse.json({
          weatherData: fallbackData,
          isFallback: true
        });
      }

      const data: WeatherData = await response.json();
      console.log('[WEATHER-API] Successfully fetched weather data for:', data.location.name);

      return NextResponse.json({
        weatherData: data,
        isFallback: false
      });
    } catch (fetchError: any) {
      console.error('[WEATHER-API] Error during weather API fetch:', fetchError.message);
      console.error('[WEATHER-API] Error stack:', fetchError.stack);
      throw fetchError; // Re-throw to be caught by outer try-catch
    }

  } catch (error: any) {
    console.error('[WEATHER-API] Error fetching weather data:', error.message);
    console.error('[WEATHER-API] Error stack:', error.stack);

    // Return Jeddah weather as ultimate fallback
    console.log('[WEATHER-API] Attempting ultimate fallback to Jeddah by name');

    try {
      const ultimateFallbackUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Jeddah&aqi=no`;
      console.log('[WEATHER-API] Ultimate fallback URL (redacted key):', WEATHER_API_KEY ? ultimateFallbackUrl.replace(WEATHER_API_KEY, 'REDACTED') : ultimateFallbackUrl);

      const fallbackResponse = await fetch(ultimateFallbackUrl);
      console.log('[WEATHER-API] Ultimate fallback response status:', fallbackResponse.status);

      if (fallbackResponse.ok) {
        const fallbackData: WeatherData = await fallbackResponse.json();
        console.log('[WEATHER-API] Successfully fetched ultimate fallback data for Jeddah');

        return NextResponse.json({
          weatherData: fallbackData,
          isFallback: true,
          message: 'Using fallback location due to error with provided coordinates'
        });
      } else {
        console.error('[WEATHER-API] Ultimate fallback failed, status:', fallbackResponse.status);
        console.error('[WEATHER-API] Response text:', await fallbackResponse.text());
      }
    } catch (fallbackError: any) {
      console.error('[WEATHER-API] Ultimate fallback weather fetch failed:', fallbackError.message);
      console.error('[WEATHER-API] Fallback error stack:', fallbackError.stack);
    }

    // If all attempts fail, return detailed error
    return NextResponse.json({ 
      error: 'Failed to fetch weather data',
      errorType: 'WeatherAPIError',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
