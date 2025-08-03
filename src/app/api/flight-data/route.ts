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
  flyingHours: number;
  loadFactor: number;
  guestsCarried: number;
  // Date range
  dateRange: {
    from: string;
    to: string;
    days: number;
    actualDate: string;
  };
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

  // Also log PASON columns specifically
  const pasonHeaders = headers.slice(51, 57).map((h, i) => `${i + 51}: ${h}`);
  console.log('[CSV-PARSE] PASON columns:', pasonHeaders);

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

      // IMPORTANT: Only use actual block times, not scheduled times as fallback
      // This was causing double counting if BLOF/BLON were empty and fell back to STD/STA
      const blofRaw = values[columnMap['BLOF']] || '';
      const blonRaw = values[columnMap['BLON']] || '';

      // Only use block times if they are actually provided
      const blof = blofRaw; // Don't fall back to STD
      const blon = blonRaw; // Don't fall back to STA

      // Debug: Log raw time values for first few records
      if (records.length < 3) {
        console.log(`[TIME-DEBUG] Flight ${values[columnMap['CARRIER']]}${values[columnMap['FLT']]} raw times:`);
        console.log(`  - STD: "${std}", STA: "${sta}"`);
        console.log(`  - BLOF: "${blof}" (raw: "${blofRaw}"), BLON: "${blon}" (raw: "${blonRaw}")`);
        console.log(`  - Using fallback: BLOF=${blof !== blofRaw}, BLON=${blon !== blonRaw}`);
      }

      // Calculate block time (flying hours)
      let blockTime = 0;
      if (blof && blon && blof !== '00:00' && blon !== '00:00') {
        const [blofHours, blofMinutes] = blof.split(':').map(Number);
        const [blonHours, blonMinutes] = blon.split(':').map(Number);

        let blofTotalMinutes = blofHours * 60 + blofMinutes;
        let blonTotalMinutes = blonHours * 60 + blonMinutes;

        // Log first few flights to debug block time calculation
        if (records.length < 5) {
          console.log(`[BLOCK-TIME] Flight ${values[columnMap['CARRIER']]}${values[columnMap['FLT']]}`);
          console.log(`  - BLOF (departure): ${blof} = ${blofTotalMinutes} minutes`);
          console.log(`  - BLON (arrival): ${blon} = ${blonTotalMinutes} minutes`);
        }

        // Handle overnight flights
        let overnightApplied = false;
        let originalBlonMinutes = blonTotalMinutes;

        // Only apply overnight logic if arrival is before departure
        // AND the difference would be negative (indicating a day boundary crossing)
        if (blonTotalMinutes < blofTotalMinutes) {
          // Check if this is likely an overnight flight or a data issue
          // Most flights shouldn't be longer than 12 hours
          const potentialBlockTime = (blonTotalMinutes + 24 * 60) - blofTotalMinutes;

          if (potentialBlockTime > 720) { // More than 12 hours
            console.warn(`[BLOCK-TIME] Suspicious overnight calculation for ${values[columnMap['CARRIER']]}${values[columnMap['FLT']]}`);
            console.warn(`  - Would result in ${potentialBlockTime} minutes (${(potentialBlockTime / 60).toFixed(2)} hours)`);
            // Don't apply overnight logic - likely a data issue
            blockTime = 0; // Mark as invalid
          } else {
            blonTotalMinutes += 24 * 60;
            overnightApplied = true;
            blockTime = blonTotalMinutes - blofTotalMinutes;
          }
        } else {
          blockTime = blonTotalMinutes - blofTotalMinutes;
        }

        // Log calculation details for first few flights
        if (records.length < 5) {
          console.log(`  - Overnight logic applied: ${overnightApplied}`);
          console.log(`  - Block time: ${blockTime} minutes (${(blockTime / 60).toFixed(2)} hours)`);
        }

        // Validate block time - domestic flights shouldn't exceed 6 hours typically
        if (blockTime > 360) { // 6 hours
          console.warn(`[BLOCK-TIME] WARNING: Unusually long block time for ${values[columnMap['CARRIER']]}${values[columnMap['FLT']]}: ${blockTime} minutes (${(blockTime / 60).toFixed(2)} hours)`);
          console.warn(`  - Route: ${values[columnMap['DEP']]} -> ${values[columnMap['ARR']]}`);
          console.warn(`  - BLOF: ${blof}, BLON: ${blon}`);
        }
      }

      // Parse passenger count from PASON fields
      // The CSV has 6 PASON columns at indices 51-56
      // Based on the data pattern, it appears columns 52 and 53 might be duplicating passenger counts
      // We'll use only column 52 (main passengers) + column 54 (likely children/infants)
      let passengers = 0;
      const pasonStartIndex = 51;
      const pasonEndIndex = 56;
      const pasonValues = [];

      for (let i = pasonStartIndex; i <= pasonEndIndex && i < values.length; i++) {
        const pax = parseInt(values[i]) || 0;
        pasonValues.push(pax);
      }

      // Only sum specific columns to avoid double counting
      // Column 52 (index 1 in pasonValues): Main passenger count
      // Column 54 (index 3 in pasonValues): Additional passengers (children/infants)
      passengers = (pasonValues[1] || 0) + (pasonValues[3] || 0);

      // Log detailed passenger data for first 5 records to debug
      if (records.length < 5) {
        console.log(`[CSV-PARSE] Flight ${values[columnMap['CARRIER']]}${values[columnMap['FLT']]} PASON columns:`, pasonValues);
        console.log(`  - Using columns 52 (${pasonValues[1]}) + 54 (${pasonValues[3]}) = ${passengers} passengers`);
        console.log(`  - Previous total (all columns): ${pasonValues.reduce((a, b) => a + b, 0)}`);
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
  const uniqueDates = Array.from(new Set(records.map(r => r.date))).sort();
  console.log('[FLIGHT-DATA] Available dates in data:', uniqueDates.slice(0, 10));

  // Debug: Check flight types
  const flightTypes = Array.from(new Set(records.map(r => r.flightType)));
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
      const sortedDates = Array.from(new Set(typeJFlights.map(r => r.date))).sort((a, b) => {
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
  let duplicatesFound = 0;

  filteredFlights.forEach(flight => {
    // Include date and scheduled departure time in the key to ensure uniqueness
    const key = `${flight.flightNumber}-${flight.origin}-${flight.destination}-${flight.date}-${flight.scheduledDeparture}`;

    if (uniqueFlights.has(key)) {
      duplicatesFound++;
      console.log(`[FLIGHT-DATA] Duplicate flight found: ${flight.flightNumber} on ${flight.date} at ${flight.scheduledDeparture}`);
    } else {
      uniqueFlights.set(key, flight);
    }
  });

  if (duplicatesFound > 0) {
    console.log(`[FLIGHT-DATA] Found and removed ${duplicatesFound} duplicate flights`);
  }

  // Convert back to array
  const filteredRecords = Array.from(uniqueFlights.values());
  console.log(`[FLIGHT-DATA] Unique flights after deduplication: ${filteredRecords.length}`);

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

  // Calculate average block time to detect anomalies
  const avgBlockTime = flightsWithBlockTime.length > 0 ? totalBlockMinutes / flightsWithBlockTime.length : 0;

  console.log(`[FLIGHT-DATA] Flying Hours Calculation:`);
  console.log(`  - Flights with block time: ${flightsWithBlockTime.length}`);
  console.log(`  - Total block minutes: ${totalBlockMinutes}`);
  console.log(`  - Flying hours: ${flyingHours}`);
  console.log(`  - Average block time per flight: ${avgBlockTime.toFixed(2)} minutes (${(avgBlockTime / 60).toFixed(2)} hours)`);

  // Log sample of flights with their block times to verify
  console.log(`[FLIGHT-DATA] Sample flights with block times:`);
  flightsWithBlockTime.slice(0, 5).forEach(flight => {
    console.log(`  - ${flight.flightNumber}: ${flight.blockTime} min (${(flight.blockTime / 60).toFixed(2)} hrs) ${flight.origin}->${flight.destination}`);
  });

  // Check for potential double counting
  const blockTimeDistribution = new Map<number, number>();
  flightsWithBlockTime.forEach(flight => {
    const hours = Math.floor(flight.blockTime / 60);
    blockTimeDistribution.set(hours, (blockTimeDistribution.get(hours) || 0) + 1);
  });

  console.log(`[FLIGHT-DATA] Block time distribution (hours):`);
  Array.from(blockTimeDistribution.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([hours, count]) => {
      console.log(`  - ${hours}h: ${count} flights`);
    });

  // 2. Guests Carried - Total passengers
  const flightsWithPassengers = filteredRecords.filter(r => !r.cancelled);
  const totalPassengers = flightsWithPassengers.reduce((sum, r) => sum + r.passengers, 0);
  const guestsCarried = Math.round(totalPassengers / 1000); // In thousands

  console.log(`[FLIGHT-DATA] Guests Carried Calculation:`);
  console.log(`  - Operated flights: ${flightsWithPassengers.length}`);
  console.log(`  - Total passengers: ${totalPassengers}`);
  console.log(`  - Guests carried (thousands): ${guestsCarried}`);

  // Log sample of passenger counts to check for anomalies
  const passengerSample = flightsWithPassengers.slice(0, 5).map(f => ({
    flight: f.flightNumber,
    passengers: f.passengers
  }));
  console.log(`[FLIGHT-DATA] Sample passenger counts:`, passengerSample);

  // 3. Calculate Load Factor
  // A320 has approximately 186 seats
  const seatsPerFlight = 186;
  const totalSeats = operatedFlights * seatsPerFlight;
  const loadFactor = totalSeats > 0 ? Math.round((totalPassengers / totalSeats) * 100) : 0;

  console.log(`[FLIGHT-DATA] Load Factor Calculation:`);
  console.log(`  - Operated flights: ${operatedFlights}`);
  console.log(`  - Seats per flight: ${seatsPerFlight}`);
  console.log(`  - Total seats: ${totalSeats}`);
  console.log(`  - Load factor: ${loadFactor}%`);

  // Data validation checks
  const avgPassengersPerFlight = operatedFlights > 0 ? Math.round(totalPassengers / operatedFlights) : 0;
  console.log(`[FLIGHT-DATA] Data Validation:`);
  console.log(`  - Average passengers per flight: ${avgPassengersPerFlight}`);

  if (avgPassengersPerFlight > seatsPerFlight) {
    console.warn(`[FLIGHT-DATA] WARNING: Average passengers per flight (${avgPassengersPerFlight}) exceeds seat capacity (${seatsPerFlight})`);
    console.warn(`[FLIGHT-DATA] This suggests possible double counting in passenger data`);
  }

  if (flyingHours > operatedFlights * 24) {
    console.warn(`[FLIGHT-DATA] WARNING: Flying hours (${flyingHours}) seems too high for ${operatedFlights} flights`);
  }

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
    console.log('[FLIGHT-DATA] API route called');

    // Check authentication
    console.log('[FLIGHT-DATA] Checking authentication');
    const session = await getAuthSession();

    if (!session || !session.user) {
      console.log('[FLIGHT-DATA] Authentication failed - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[FLIGHT-DATA] Authenticated as:', session.user.email);

    // Fetch CSV content from SharePoint
    console.log('[FLIGHT-DATA] Fetching CSV content from SharePoint');
    try {
      const csvContent = await getFileContent('Exp1004.csv');
      console.log('[FLIGHT-DATA] Successfully fetched CSV content, length:', csvContent.length);

      // Parse CSV data
      console.log('[FLIGHT-DATA] Parsing CSV data');
      const flightRecords = parseCSV(csvContent);
      console.log('[FLIGHT-DATA] Successfully parsed CSV data, records:', flightRecords.length);

      // Calculate metrics
      console.log('[FLIGHT-DATA] Calculating metrics');
      const metrics = calculateMetrics(flightRecords);
      console.log('[FLIGHT-DATA] Successfully calculated metrics');

      // Return the calculated metrics
      return NextResponse.json({
        success: true,
        metrics,
        recordCount: flightRecords.length,
      });
    } catch (sharePointError: any) {
      console.error('[FLIGHT-DATA] SharePoint error:', sharePointError.message);
      console.error('[FLIGHT-DATA] SharePoint error stack:', sharePointError.stack);

      // Return more detailed error for SharePoint issues
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch flight data from SharePoint',
        errorType: 'SharePoint',
        message: sharePointError.message,
        details: process.env.NODE_ENV === 'development' ? sharePointError.stack : undefined,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[FLIGHT-DATA] Error processing flight data:', error);
    console.error('[FLIGHT-DATA] Error stack:', error.stack);

    // Return detailed error information
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process flight data',
      errorType: 'General',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}
