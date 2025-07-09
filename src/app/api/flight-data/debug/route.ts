import { NextRequest, NextResponse } from 'next/server';
import { getFileContent } from '@/lib/sharepointClient';

export async function GET(request: NextRequest) {
  try {
    console.log('[FLIGHT-DEBUG] Fetching CSV content...');
    
    // Fetch CSV content
    const csvContent = await getFileContent('Exp1004.csv');
    
    // Get first 5 lines to understand structure
    const lines = csvContent.trim().split('\n').slice(0, 5);
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Sample data rows
    const sampleRows = lines.slice(1, 4).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      return row;
    });
    
    // Check PASON fields specifically
    const pasonIndices: number[] = [];
    headers.forEach((header, index) => {
      if (header === 'PASON') {
        pasonIndices.push(index);
      }
    });
    
    // Get sample PASON values
    const samplePasonValues = lines.slice(1, 10).map(line => {
      const values = line.split(',');
      return pasonIndices.map(idx => values[idx] || 'empty');
    });
    
    return NextResponse.json({
      success: true,
      headers,
      headerCount: headers.length,
      sampleRows,
      totalLines: csvContent.trim().split('\n').length,
      firstLine: lines[0],
      contentPreview: csvContent.substring(0, 500),
      pasonInfo: {
        pasonFieldCount: pasonIndices.length,
        pasonFieldIndices: pasonIndices,
        samplePasonValues: samplePasonValues
      }
    });
  } catch (error: any) {
    console.error('[FLIGHT-DEBUG] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}