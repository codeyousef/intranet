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
  flightType: string; // FLTYPE field
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
  
  // Debug: Log headers to see what columns we have
  console.log('[CSV-PARSE] Headers found:', headers.slice(0, 20));

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
        flightType: values[columnMap['FLTYPE']] || '',
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
  // Get yesterday's date in CSV format (MM/DD/YYYY) - corrected format
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayFormatted = `${String(yesterday.getMonth() + 1).padStart(2, '0')}/${String(yesterday.getDate()).padStart(2, '0')}/${yesterday.getFullYear()}`;
  
  console.log('[FLIGHT-DATA] Looking for flights on:', yesterdayFormatted);
  console.log('[FLIGHT-DATA] Total records before filtering:', records.length);
  
  // Debug: Check what dates we have in the data
  const uniqueDates = [...new Set(records.map(r => r.date))].sort();
  console.log('[FLIGHT-DATA] Available dates in data:', uniqueDates.slice(0, 10));
  
  // Debug: Check flight types
  const flightTypes = [...new Set(records.map(r => r.flightType))];
  console.log('[FLIGHT-DATA] Available flight types:', flightTypes);
  
  // Filter for yesterday's flights with flight type 'J' (trim spaces and case insensitive)
  // Also filter out flights with blank BLOF (actual departure)
  const yesterdaysFlights = records.filter(r => 
    r.date === yesterdayFormatted && 
    r.flightType.trim().toUpperCase() === 'J' &&
    r.actualDeparture && r.actualDeparture.trim() !== '' && r.actualDeparture !== '00:00'
  );
  
  // Debug: Check how many flights we're filtering out
  const yesterdaysAllTypeJ = records.filter(r => 
    r.date === yesterdayFormatted && 
    r.flightType.trim().toUpperCase() === 'J'
  );
  console.log('[FLIGHT-DATA] Type J flights for yesterday (before BLOF filter):', yesterdaysAllTypeJ.length);
  console.log('[FLIGHT-DATA] Type J flights with valid BLOF:', yesterdaysFlights.length);
  
  // If no data for yesterday, try to find the most recent date with data
  let filteredFlights = yesterdaysFlights;
  let targetDate = yesterdayFormatted;
  
  if (yesterdaysFlights.length === 0) {
    console.log('[FLIGHT-DATA] No data for yesterday, looking for most recent date...');
    
    // Get all flights with type J (trim spaces and case insensitive)
    // Also filter out flights with blank BLOF
    const typeJFlights = records.filter(r => 
      r.flightType.trim().toUpperCase() === 'J' &&
      r.actualDeparture && r.actualDeparture.trim() !== '' && r.actualDeparture !== '00:00'
    );
    
    if (typeJFlights.length > 0) {
      // Find the most recent date (MM/DD/YYYY format)
      const sortedDates = [...new Set(typeJFlights.map(r => r.date))].sort((a, b) => {
        const [monthA, dayA, yearA] = a.split('/').map(Number);
        const [monthB, dayB, yearB] = b.split('/').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateB.getTime() - dateA.getTime();
      });
      
      targetDate = sortedDates[0];
      filteredFlights = typeJFlights.filter(r => r.date === targetDate);
      console.log('[FLIGHT-DATA] Using most recent date with data:', targetDate, 'with', filteredFlights.length, 'flights');
    }
  }
  
  // Get unique flight numbers (to avoid counting the same flight multiple times)
  const uniqueFlights = new Map<string, FlightRecord>();
  filteredFlights.forEach(flight => {
    const key = `${flight.flightNumber}-${flight.origin}-${flight.destination}`;
    // If we already have this flight, keep the one with the latest scheduled departure
    if (!uniqueFlights.has(key) || flight.scheduledDeparture > uniqueFlights.get(key)!.scheduledDeparture) {
      uniqueFlights.set(key, flight);
    }
  });
  
  // Convert back to array
  const filteredRecords = Array.from(uniqueFlights.values());
  
  // Calculate basic counts
  const totalFlights = filteredRecords.length;
  const onTimeFlights = filteredRecords.filter(r => !r.cancelled && r.arrivalDelay <= 15).length;
  const delayedFlights = filteredRecords.filter(r => !r.cancelled && r.arrivalDelay > 15).length;
  const cancelledFlights = filteredRecords.filter(r => r.cancelled).length;
  
  // Calculate OTP (On-Time Performance)
  const operatedFlights = totalFlights - cancelledFlights;
  const onTimePerformance = operatedFlights > 0 ? (onTimeFlights / operatedFlights) * 100 : 0;
  
  // Calculate average delay (using arrival delays for delayed flights only)
  const delayedFlightsOnly = filteredRecords.filter(r => !r.cancelled && r.arrivalDelay > 15);
  const totalDelayMinutes = delayedFlightsOnly.reduce((sum, r) => sum + Math.abs(r.arrivalDelay), 0);
  const averageDelayMinutes = delayedFlightsOnly.length > 0 ? totalDelayMinutes / delayedFlightsOnly.length : 0;
  
  // Calculate top delayed routes
  const routeDelays = new Map<string, { delays: number; totalDelay: number }>();
  filteredRecords.forEach(r => {
    if (!r.cancelled && r.arrivalDelay > 15) {
      const route = `${r.origin}-${r.destination}`;
      const current = routeDelays.get(route) || { delays: 0, totalDelay: 0 };
      current.delays++;
      current.totalDelay += Math.abs(r.arrivalDelay);
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
  
  // Calculate business metrics for yesterday only
  
  // 1. Flying Hours - Total block hours
  const flightsWithBlockTime = filteredRecords.filter(r => !r.cancelled && r.blockTime > 0);
  const totalBlockMinutes = flightsWithBlockTime.reduce((sum, r) => sum + r.blockTime, 0);
  const flyingHours = Math.round(totalBlockMinutes / 60);
  
  // 2. Guests Carried - Total passengers
  const totalPassengers = filteredRecords
    .filter(r => !r.cancelled)
    .reduce((sum, r) => sum + r.passengers, 0);
  const guestsCarried = Math.round(totalPassengers / 1000); // In thousands
  
  // 3. Calculate Load Factor
  // A320 has approximately 186 seats
  const seatsPerFlight = 186;
  const totalSeats = operatedFlights * seatsPerFlight;
  const loadFactor = totalSeats > 0 ? Math.round((totalPassengers / totalSeats) * 100) : 0;
  
  // Parse the target date for the date range (MM/DD/YYYY format)
  const [month, day, year] = targetDate.split('/').map(Number);
  const actualDate = new Date(year, month - 1, day);

  return {
    totalFlights,
    onTimeFlights,
    delayedFlights,
    cancelledFlights,
    onTimePerformance: Math.round(onTimePerformance * 10) / 10,
    averageDelayMinutes: Math.round(averageDelayMinutes),
    topDelayedRoutes,
    flightsByStatus,
    todaysFlights: totalFlights, // For the target date
    lastUpdated: new Date().toISOString(),
    // Business metrics
    flyingHours,
    loadFactor,
    guestsCarried,
    // Date range - the actual date used
    dateRange: {
      from: actualDate.toISOString(),
      to: actualDate.toISOString(),
      days: 1,
      actualDate: targetDate
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getAuthSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch CSV content from SharePoint
    const csvContent = await getFileContent('Exp1004.csv');
    
    // Parse CSV data
    const flightRecords = parseCSV(csvContent);
    
    // Calculate metrics
    const metrics = calculateMetrics(flightRecords);
    
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