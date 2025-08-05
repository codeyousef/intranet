# PowerShell script for testing the newsletter fix v2
# This script makes requests to the test-newsletter-fix-v2 API endpoint
# with different test parameters and displays the results

Write-Host "Testing newsletter fix v2..." -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan
Write-Host ""

# Get the base URL from the command line or use localhost:3000 as default
$BaseUrl = if ($args[0]) { $args[0] } else { "http://localhost:3000" }
$TestBaseUrl = "$BaseUrl/api/test-newsletter-fix-v2"

# Function to run a test case
function Test-NewsletterCase {
    param (
        [string]$TestCase = "default",
        [switch]$ForceFetch = $false,
        [switch]$ClearCache = $false,
        [string]$Description = ""
    )
    
    # Build the URL with parameters
    $TestUrl = $TestBaseUrl
    $Params = @()
    
    if ($TestCase -ne "default") {
        $Params += "test=$TestCase"
    }
    
    if ($ForceFetch) {
        $Params += "force=true"
    }
    
    if ($ClearCache) {
        $Params += "clear_cache=true"
    }
    
    if ($Params.Count -gt 0) {
        $TestUrl += "?" + ($Params -join "&")
    }
    
    # Display test information
    Write-Host "Test Case: $TestCase" -ForegroundColor Yellow
    if ($Description) {
        Write-Host $Description -ForegroundColor Gray
    }
    Write-Host "URL: $TestUrl" -ForegroundColor Gray
    
    try {
        # Make the request
        $Response = Invoke-RestMethod -Uri $TestUrl -Method Get -ErrorAction Stop
        
        # Display results
        Write-Host "✅ Test successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Newsletter Info:" -ForegroundColor White
        Write-Host "  Title: $($Response.newsletterInfo.title)" -ForegroundColor White
        Write-Host "  Content Length: $($Response.newsletterInfo.contentLength) characters" -ForegroundColor White
        Write-Host "  Source: $($Response.newsletterInfo.source)" -ForegroundColor White
        
        # Display fallback info if applicable
        if ($Response.newsletterInfo.isFallback) {
            Write-Host ""
            Write-Host "Fallback Information:" -ForegroundColor Yellow
            Write-Host "  Is Fallback: $($Response.newsletterInfo.isFallback)" -ForegroundColor Yellow
            Write-Host "  Reason: $($Response.newsletterInfo.fallbackReason)" -ForegroundColor Yellow
            if ($Response.newsletterInfo.errorType -ne "none") {
                Write-Host "  Error Type: $($Response.newsletterInfo.errorType)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Host "❌ Test failed!" -ForegroundColor Red
        Write-Host ""
        
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode.value__
            Write-Host "Status code: $statusCode" -ForegroundColor Red
            
            if ($statusCode -eq 401) {
                Write-Host ""
                Write-Host "Authentication required. Please sign in to the application first." -ForegroundColor Yellow
            }
            
            try {
                $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
                Write-Host "Error: $($errorObj.error)" -ForegroundColor Red
                if ($errorObj.message) {
                    Write-Host "Message: $($errorObj.message)" -ForegroundColor Red
                }
            } catch {
                Write-Host "Error: $_" -ForegroundColor Red
            }
        } else {
            Write-Host "Error: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "--------------------------" -ForegroundColor Gray
    Write-Host ""
}

# Run the tests
Write-Host "Running test cases..." -ForegroundColor Cyan
Write-Host ""

# Test 1: Default case
Test-NewsletterCase -Description "Testing normal operation (should succeed)"

# Test 2: Force fetch
Test-NewsletterCase -ForceFetch -Description "Testing with force fetch (should bypass cache)"

# Test 3: Simulate not found error
Test-NewsletterCase -TestCase "not-found" -Description "Simulating 'file not found' error (should show fallback content)"

# Test 4: Simulate permission error
Test-NewsletterCase -TestCase "permission-error" -Description "Simulating 'permission denied' error (should show fallback content)"

# Test 5: Simulate network error
Test-NewsletterCase -TestCase "network-error" -Description "Simulating 'network connectivity' error (should show fallback content)"

# Test 6: Simulate HTML error
Test-NewsletterCase -TestCase "html-error" -Description "Simulating 'HTML processing' error (should handle malformed HTML)"

Write-Host "All tests completed!" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan