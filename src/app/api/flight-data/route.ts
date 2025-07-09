import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { getFileContent } from '@/lib/sharepointClient';

// Define the structure of a flight record
interface FlightRecord {
  flightNumber: string;
  date: string;
  scheduledDeparture: string;
  actualDeparture: string;
  scheduledArrival: string;
  actualArrival: string;
  origin: string;
  destination: string;
  status: string;
  departureDelay: number;
  arrivalDelay: number;
  aircraftReg: string;
  cancelled: boolean;
  blockTime: number; // Block time in minutes (BLON - BLOF)
  passengers: number; // Total passengers
}

// Define the structure of calculated metrics
interface FlightMetrics {
  totalFlights: number;
  onTimeFlights: number;
  delayedFlights: number;
  cancelledFlights: number;
  onTimePerformance: number;
  averageDelayMinutes: number;
  topDelayedRoutes: Array<{
    route: string;
    delays: number;
    avgDelay: number;
  }>;
  flightsByStatus: {
    onTime: number;
    delayed: number;
    cancelled: number;
    diverted: number;
  };
  todaysFlights: number;
  lastUpdated: string;
  // Business metrics
  onTimePerformance: number;
  flyingHours: number;
  loadFactor: number;
  guestsCarried: number;
}

// Parse CSV data
function parseCSV(csvContent: string): FlightRecord[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header to get column indices
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Map headers to expected column names based on actual CSV structure
  const columnMap: { [key: string]: number } = {};
  headers.forEach((header, index) => {
    columnMap[header] = index;
  });

  // Parse data rows
  const records: FlightRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    // Skip empty lines
    if (values.length < 10) continue;

    try {
      // Extract data based on actual column mapping
      const cancelled = values[columnMap['CANCELLED']] === '1';
      const departureDelay = parseInt(values[columnMap['DDLY']] || '0') || 0;
      const arrivalDelay = parseInt(values[columnMap['ADLY']] || '0') || 0;
      
      // Determine status based on delays and cancelled flag
      let status = 'On Time';
      if (cancelled) {
        status = 'Cancelled';
      } else if (departureDelay > 15 || arrivalDelay > 15) {
        status = 'Delayed';
      }
      
      // Parse times
      const std = values[columnMap['STD']] || '';
      const sta = values[columnMap['STA']] || '';
      const blof = values[columnMap['BLOF']] || std; // Block off time (actual departure)
      const blon = values[columnMap['BLON']] || sta; // Block on time (actual arrival)
      
      // Calculate block time (flying hours)
      let blockTime = 0;
      if (blof && blon && blof !== '00:00' && blon !== '00:00') {
        const [blofHours, blofMinutes] = blof.split(':').map(Number);
        const [blonHours, blonMinutes] = blon.split(':').map(Number);
        
        let blofTotalMinutes = blofHours * 60 + blofMinutes;
        let blonTotalMinutes = blonHours * 60 + blonMinutes;
        
        // Handle overnight flights
        if (blonTotalMinutes < blofTotalMinutes) {
          blonTotalMinutes += 24 * 60;
        }
        
        blockTime = blonTotalMinutes - blofTotalMinutes;
      }
      
      // Parse passenger count from PASON fields
      // The CSV has 6 PASON columns at indices 51-56, we'll sum them up
      let passengers = 0;
      const pasonStartIndex = 51;
      const pasonEndIndex = 56;
      for (let i = pasonStartIndex; i <= pasonEndIndex && i < values.length; i++) {
        const pax = parseInt(values[i]) || 0;
        passengers += pax;
      }
      
      const record: FlightRecord = {
        flightNumber: `${values[columnMap['CARRIER']]}${values[columnMap['FLT']]}`,
        date: values[columnMap['DAY']],
        scheduledDeparture: std,
        actualDeparture: blof,
        scheduledArrival: sta,
        actualArrival: blon,
        origin: values[columnMap['DEP']],
        destination: values[columnMap['ARR']],
        status: status,
        departureDelay: departureDelay,
        arrivalDelay: arrivalDelay,
        aircraftReg: values[columnMap['REG']],
        cancelled: cancelled,
        blockTime: blockTime,
        passengers: passengers,
      };

      records.push(record);
    } catch (error) {
      console.error(`Error parsing row ${i}:`, error);
    }
  }

  return records;
}

// Calculate flight metrics from records
function calculateMetrics(records: FlightRecord[]): FlightMetrics {
  // Format today's date to match CSV format (DD/MM/YYYY)
  const today = new Date();
  const todayFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  
  // Filter today's flights
  const todaysFlights = records.filter(r => r.date === todayFormatted);
  
  // Calculate basic counts
  const totalFlights = records.length;
  const onTimeFlights = records.filter(r => !r.cancelled && Math.max(r.departureDelay, r.arrivalDelay) <= 15).length;
  const delayedFlights = records.filter(r => !r.cancelled && Math.max(r.departureDelay, r.arrivalDelay) > 15).length;
  const cancelledFlights = records.filter(r => r.cancelled).length;
  
  // Calculate OTP (On-Time Performance)
  const operatedFlights = totalFlights - cancelledFlights;
  const onTimePerformance = operatedFlights > 0 ? (onTimeFlights / operatedFlights) * 100 : 0;
  
  // Calculate average delay (using departure delays)
  const delayedFlightsOnly = records.filter(r => !r.cancelled && r.departureDelay > 0);
  const totalDelayMinutes = delayedFlightsOnly.reduce((sum, r) => sum + Math.abs(r.departureDelay), 0);
  const averageDelayMinutes = delayedFlightsOnly.length > 0 ? totalDelayMinutes / delayedFlightsOnly.length : 0;
  
  // Calculate top delayed routes
  const routeDelays = new Map<string, { delays: number; totalDelay: number }>();
  records.forEach(r => {
    if (!r.cancelled && Math.max(r.departureDelay, r.arrivalDelay) > 15) {
      const route = `${r.origin}-${r.destination}`;
      const current = routeDelays.get(route) || { delays: 0, totalDelay: 0 };
      current.delays++;
      current.totalDelay += Math.max(Math.abs(r.departureDelay), Math.abs(r.arrivalDelay));
      routeDelays.set(route, current);
    }
  });
  
  const topDelayedRoutes = Array.from(routeDelays.entries())
    .map(([route, data]) => ({
      route,
      delays: data.delays,
      avgDelay: Math.round(data.totalDelay / data.delays),
    }))
    .sort((a, b) => b.delays - a.delays)
    .slice(0, 5);
  
  // Count flights by status
  const flightsByStatus = {
    onTime: onTimeFlights,
    delayed: delayedFlights,
    cancelled: cancelledFlights,
    diverted: 0, // Not in the current data structure
  };
  
  // Calculate business metrics
  
  // 1. Flying Hours - Total block hours
  const flightsWithBlockTime = records.filter(r => !r.cancelled && r.blockTime > 0);
  console.log(`[METRICS] Flights with block time: ${flightsWithBlockTime.length}`);
  const totalBlockMinutes = flightsWithBlockTime.reduce((sum, r) => sum + r.blockTime, 0);
  const flyingHours = Math.round(totalBlockMinutes / 60);
  console.log(`[METRICS] Total block minutes: ${totalBlockMinutes}, Flying hours: ${flyingHours}`);
  
  // 2. Guests Carried - Total passengers
  const flightsWithPassengers = records.filter(r => !r.cancelled && r.passengers > 0);
  console.log(`[METRICS] Flights with passengers: ${flightsWithPassengers.length}`);
  const totalPassengers = records
    .filter(r => !r.cancelled)
    .reduce((sum, r) => sum + r.passengers, 0);
  const guestsCarried = Math.round(totalPassengers / 1000); // In thousands
  console.log(`[METRICS] Total passengers: ${totalPassengers}, Guests carried (K): ${guestsCarried}`);
  
  // 3. Calculate Load Factor
  // A320 has approximately 186 seats
  const seatsPerFlight = 186;
  const totalSeats = operatedFlights * seatsPerFlight;
  const loadFactor = totalSeats > 0 ? Math.round((totalPassengers / totalSeats) * 100) : 0;
  console.log(`[METRICS] Load Factor: ${loadFactor}% (${totalPassengers} passengers / ${totalSeats} seats)`);
  
  return {
    totalFlights,
    onTimeFlights,
    delayedFlights,
    cancelledFlights,
    onTimePerformance: Math.round(onTimePerformance * 10) / 10,
    averageDelayMinutes: Math.round(averageDelayMinutes),
    topDelayedRoutes,
    flightsByStatus,
    todaysFlights: todaysFlights.length,
    lastUpdated: new Date().toISOString(),
    // Business metrics
    flyingHours,
    loadFactor,
    guestsCarried,
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('[FLIGHT-DATA] API endpoint called');
    
    // Check authentication
    const session = await getAuthSession();
    console.log('[FLIGHT-DATA] Session check:', session ? 'authenticated' : 'not authenticated');
    
    if (!session || !session.user) {
      console.log('[FLIGHT-DATA] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[FLIGHT-DATA] Fetching flight data from SharePoint...');

    // Fetch CSV content from SharePoint
    const csvContent = await getFileContent('Exp1004.csv');
    
    console.log('[FLIGHT-DATA] CSV content fetched, parsing data...');
    
    // Parse CSV data
    const flightRecords = parseCSV(csvContent);
    
    console.log(`[FLIGHT-DATA] Parsed ${flightRecords.length} flight records`);
    
    // Debug: Check sample records
    const sampleRecords = flightRecords.slice(0, 5);
    console.log('[FLIGHT-DATA] Sample records:', sampleRecords.map(r => ({
      flight: r.flightNumber,
      passengers: r.passengers,
      blockTime: r.blockTime,
      cancelled: r.cancelled
    })));
    
    // Calculate metrics
    const metrics = calculateMetrics(flightRecords);
    
    console.log('[FLIGHT-DATA] Metrics calculated successfully');
    
    // Return the calculated metrics
    return NextResponse.json({
      success: true,
      metrics,
      recordCount: flightRecords.length,
    });
  } catch (error: any) {
    console.error('[FLIGHT-DATA] Error processing flight data:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process flight data',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}