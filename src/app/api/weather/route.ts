import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Store API key securely in environment variable
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || '7b780a57ff2c4e11afa104921250402';

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
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { latitude, longitude } = await request.json();

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
    }

    // Fetch weather data from WeatherAPI
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${latitude},${longitude}&aqi=no`
    );

    if (!response.ok) {
      // If location-based weather fails, fallback to Jeddah
      const fallbackResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=21.543333,39.172778&aqi=no`
      );
      
      if (!fallbackResponse.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const fallbackData: WeatherData = await fallbackResponse.json();
      return NextResponse.json({
        weatherData: fallbackData,
        isFallback: true
      });
    }

    const data: WeatherData = await response.json();
    return NextResponse.json({
      weatherData: data,
      isFallback: false
    });

  } catch (error: any) {
    console.error('Error fetching weather data:', error);
    
    // Return Jeddah weather as ultimate fallback
    try {
      const fallbackResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=Jeddah&aqi=no`
      );
      
      if (fallbackResponse.ok) {
        const fallbackData: WeatherData = await fallbackResponse.json();
        return NextResponse.json({
          weatherData: fallbackData,
          isFallback: true
        });
      }
    } catch (fallbackError) {
      console.error('Fallback weather fetch failed:', fallbackError);
    }

    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}