#!/bin/bash

# Test script for the newsletter fix
# This script makes a request to the test-newsletter-fix API endpoint
# and displays the results

echo "Testing newsletter fix..."
echo "========================="
echo ""

# Get the base URL from the command line or use localhost:3000 as default
BASE_URL=${1:-"http://localhost:3000"}
TEST_URL="$BASE_URL/api/test-newsletter-fix"

echo "Making request to: $TEST_URL"
echo ""

# Make the request and save the response
RESPONSE=$(curl -s "$TEST_URL")

# Check if the request was successful
if [[ $RESPONSE == *"\"success\":true"* ]]; then
  echo "✅ Test successful!"
  echo ""
  
  # Extract and display content length
  CONTENT_LENGTH=$(echo $RESPONSE | grep -o '"contentLength":[0-9]*' | cut -d':' -f2)
  echo "Newsletter content length: $CONTENT_LENGTH characters"
  
  # Extract and display source
  SOURCE=$(echo $RESPONSE | grep -o '"source":"[^"]*"' | cut -d'"' -f4)
  echo "Newsletter source: $SOURCE"
  
  # Extract and display cached status
  CACHED=$(echo $RESPONSE | grep -o '"cached":\(true\|false\)' | cut -d':' -f2)
  echo "Cached: $CACHED"
  
  echo ""
  echo "The newsletter API is working correctly!"
else
  echo "❌ Test failed!"
  echo ""
  echo "Response:"
  echo "$RESPONSE" | python -m json.tool
  
  # Extract error message if present
  ERROR=$(echo $RESPONSE | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
  if [[ ! -z "$ERROR" ]]; then
    echo ""
    echo "Error: $ERROR"
  fi
  
  echo ""
  echo "Please check the server logs for more details."
fi

echo ""
echo "========================="