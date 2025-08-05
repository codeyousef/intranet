# PowerShell script for testing the newsletter fix
# This script makes a request to the test-newsletter-fix API endpoint
# and displays the results

Write-Host "Testing newsletter fix..." -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""

# Get the base URL from the command line or use localhost:3000 as default
$BaseUrl = if ($args[0]) { $args[0] } else { "http://localhost:3000" }
$TestUrl = "$BaseUrl/api/test-newsletter-fix"

Write-Host "Making request to: $TestUrl" -ForegroundColor Gray
Write-Host ""

try {
    # Make the request and save the response
    $Response = Invoke-RestMethod -Uri $TestUrl -Method Get -ErrorAction Stop
    
    # Check if the request was successful
    if ($Response.success -eq $true) {
        Write-Host "✅ Test successful!" -ForegroundColor Green
        Write-Host ""
        
        # Display content details
        Write-Host "Newsletter content length: $($Response.details.contentLength) characters" -ForegroundColor White
        Write-Host "Newsletter source: $($Response.details.source)" -ForegroundColor White
        Write-Host "Cached: $($Response.details.cached)" -ForegroundColor White
        
        Write-Host ""
        Write-Host "The newsletter API is working correctly!" -ForegroundColor Green
    } else {
        Write-Host "❌ Test failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        $Response | ConvertTo-Json -Depth 4 | Write-Host
        
        if ($Response.error) {
            Write-Host ""
            Write-Host "Error: $($Response.error)" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Please check the server logs for more details." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Request failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Status code: $statusCode" -ForegroundColor Red
        
        if ($statusCode -eq 401) {
            Write-Host ""
            Write-Host "Authentication required. Please sign in to the application first." -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "Please check your connection and try again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================" -ForegroundColor Cyan