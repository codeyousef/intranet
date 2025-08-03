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

// Static fallback weather data for when WeatherAPI is unavailable
const FALLBACK_WEATHER_DATA: WeatherData = {
  location: {
    name: "Jeddah",
    region: "Makkah",
    country: "Saudi Arabia"
  },
  current: {
    temp_c: 32,
    condition: {
      text: "Sunny",
      icon: "//cdn.weatherapi.com/weather/64x64/day/113.png"
    }
  }
};

// Riyadh fallback data
const RIYADH_FALLBACK_DATA: WeatherData = {
  location: {
    name: "Riyadh",
    region: "Riyadh",
    country: "Saudi Arabia"
  },
  current: {
    temp_c: 35,
    condition: {
      text: "Clear",
      icon: "//cdn.weatherapi.com/weather/64x64/day/113.png"
    }
  }
};

// Dammam fallback data
const DAMMAM_FALLBACK_DATA: WeatherData = {
  location: {
    name: "Dammam",
    region: "Eastern Province",
    country: "Saudi Arabia"
  },
  current: {
    temp_c: 33,
    condition: {
      text: "Partly cloudy",
      icon: "//cdn.weatherapi.com/weather/64x64/day/116.png"
    }
  }
};

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

    // Check if we should use fallback data (for testing)
    const url = new URL(request.url);
    const useFallback = url.searchParams.get('fallback') === 'true';

    if (useFallback) {
      console.log('[WEATHER-API] Using fallback data (requested via URL parameter)');
      return NextResponse.json({
        weatherData: FALLBACK_WEATHER_DATA,
        isFallback: true,
        fallbackReason: 'Requested via URL parameter'
      });
    }

    // Check if API key is available
    if (!WEATHER_API_KEY) {
      console.error('[WEATHER-API] Weather API key not found in environment variables');
      // Return fallback data instead of error
      console.log('[WEATHER-API] Missing API key, using fallback data');
      return NextResponse.json({
        weatherData: FALLBACK_WEATHER_DATA,
        isFallback: true,
        fallbackReason: 'Weather API key not configured'
      });
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
      // Return fallback data instead of error
      console.log('[WEATHER-API] Request parsing error, using fallback data');
      return NextResponse.json({
        weatherData: FALLBACK_WEATHER_DATA,
        isFallback: true,
        fallbackReason: 'Invalid request format'
      });
    }

    if (!latitude || !longitude) {
      console.log('[WEATHER-API] Missing coordinates, received:', { latitude, longitude });
      // Return fallback data instead of error
      console.log('[WEATHER-API] Missing coordinates, using fallback data');
      return NextResponse.json({
        weatherData: FALLBACK_WEATHER_DATA,
        isFallback: true,
        fallbackReason: 'Missing coordinates'
      });
    }

    // Select appropriate fallback data based on coordinates
    // This is a simple approximation - in a real app you might want to use a more sophisticated approach
    let fallbackData = FALLBACK_WEATHER_DATA;

    // Rough check for Riyadh coordinates
    if (latitude > 24 && latitude < 25 && longitude > 46 && longitude < 47) {
      fallbackData = RIYADH_FALLBACK_DATA;
    } 
    // Rough check for Dammam coordinates
    else if (latitude > 26 && latitude < 27 && longitude > 49 && longitude < 50) {
      fallbackData = DAMMAM_FALLBACK_DATA;
    }

    // Fetch weather data from WeatherAPI
    console.log('[WEATHER-API] Fetching weather data for coordinates:', latitude, longitude);
    const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=no`;
    console.log('[WEATHER-API] Request URL (redacted key):', apiUrl.replace(WEATHER_API_KEY, 'REDACTED'));

    try {
      const response = await fetch(apiUrl, { 
        // Add a timeout to prevent long-hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      console.log('[WEATHER-API] Response status:', response.status);

      if (!response.ok) {
        console.warn('[WEATHER-API] Primary location request failed, status:', response.status);
        console.warn('[WEATHER-API] Response text:', await response.text());

        // If location-based weather fails, fallback to Jeddah
        console.log('[WEATHER-API] Trying fallback to Jeddah coordinates');
        const fallbackUrl = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=21.543333,39.172778&aqi=no`;
        console.log('[WEATHER-API] Fallback URL (redacted key):', fallbackUrl.replace(WEATHER_API_KEY, 'REDACTED'));

        try {
          const fallbackResponse = await fetch(fallbackUrl, {
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });
          console.log('[WEATHER-API] Fallback response status:', fallbackResponse.status);

          if (!fallbackResponse.ok) {
            console.error('[WEATHER-API] Fallback request also failed, status:', fallbackResponse.status);
            console.error('[WEATHER-API] Fallback response text:', await fallbackResponse.text());
            // Return static fallback data instead of throwing an error
            console.log('[WEATHER-API] All API requests failed, using static fallback data');
            return NextResponse.json({
              weatherData: fallbackData,
              isFallback: true,
              fallbackReason: 'API requests failed'
            });
          }

          const jeddahWeatherData: WeatherData = await fallbackResponse.json();
          console.log('[WEATHER-API] Successfully fetched fallback data for Jeddah');

          return NextResponse.json({
            weatherData: jeddahWeatherData,
            isFallback: true
          });
        } catch (fallbackFetchError) {
          console.error('[WEATHER-API] Error during fallback fetch:', fallbackFetchError);
          // Return static fallback data
          console.log('[WEATHER-API] Fallback fetch error, using static fallback data');
          return NextResponse.json({
            weatherData: fallbackData,
            isFallback: true,
            fallbackReason: 'Fallback fetch error'
          });
        }
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

      // Check if it's a network error
      const isNetworkError = 
        fetchError.name === 'TypeError' && 
        (fetchError.message.includes('Failed to fetch') || 
         fetchError.message.includes('Network request failed') ||
         fetchError.message.includes('Network error') ||
         fetchError.message.includes('network timeout')) ||
        fetchError.name === 'AbortError';

      if (isNetworkError) {
        console.log('[WEATHER-API] Network error detected, using static fallback data');
        return NextResponse.json({
          weatherData: fallbackData,
          isFallback: true,
          fallbackReason: 'Network connectivity issue'
        });
      }

      // For other errors, also use fallback data
      console.log('[WEATHER-API] API fetch error, using static fallback data');
      return NextResponse.json({
        weatherData: fallbackData,
        isFallback: true,
        fallbackReason: 'API fetch error'
      });
    }
  } catch (error: any) {
    console.error('[WEATHER-API] Error fetching weather data:', error.message);
    console.error('[WEATHER-API] Error stack:', error.stack);

    // For any error, return fallback data instead of an error response
    console.log('[WEATHER-API] Using static fallback data due to error');
    return NextResponse.json({
      weatherData: FALLBACK_WEATHER_DATA,
      isFallback: true,
      fallbackReason: 'Unexpected error'
    });
  }
}
