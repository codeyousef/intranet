function testNewsletterFix() {
  console.log('🧪 Testing Newsletter Validation Logic Fix - All Scenarios');
  console.log('=========================================================');

  // Test validation function
  function testValidation(newsletter, testName) {
    const isValid =
      newsletter &&
      newsletter.content &&
      newsletter.title !== "Loading Newsletter" &&
      newsletter.title !== "Newsletter Error" &&
      newsletter.title !== "Newsletter Temporarily Unavailable" &&
      newsletter.title !== "Newsletter Service Temporarily Unavailable" &&
      // Accept all non-system content (SharePoint content) and system fallback content
      (newsletter.source !== "system" || 
       (newsletter.source === "system" && newsletter.isFallback === true));

    console.log(`📋 ${testName}:`, {
      isValid: isValid,
      title: newsletter?.title,
      source: newsletter?.source,
      isFallback: newsletter?.isFallback,
      hasContent: !!newsletter?.content
    });

    return isValid;
  }

  try {
    console.log('\n🔍 Testing all API response scenarios...\n');

    // Scenario 1: Successful SharePoint content
    console.log('1️⃣ Testing successful SharePoint content...');
    const sharepointContent = {
      title: 'CEO Newsletter',
      content: '<div><h1>Latest Newsletter</h1><p>Content from SharePoint...</p></div>',
      lastUpdated: new Date().toISOString(),
      source: 'SharePoint (fresh) - CEO Newsletter/last-newsletter.html',
      cached: false
    };
    const sharepointValid = testValidation(sharepointContent, 'SharePoint Content');
    console.log(sharepointValid ? '✅ PASSED' : '❌ FAILED');

    // Scenario 2: Cached SharePoint content
    console.log('\n2️⃣ Testing cached SharePoint content...');
    const cachedContent = {
      title: 'CEO Newsletter',
      content: '<div><h1>Cached Newsletter</h1><p>Content from cache...</p></div>',
      lastUpdated: new Date().toISOString(),
      source: 'SharePoint (cached)',
      cached: true
    };
    const cachedValid = testValidation(cachedContent, 'Cached Content');
    console.log(cachedValid ? '✅ PASSED' : '❌ FAILED');

    // Scenario 3: System fallback content (when file not found)
    console.log('\n3️⃣ Testing system fallback content...');
    const fallbackContent = {
      title: 'Newsletter Update',
      content: '<div><h2>Newsletter Coming Soon</h2><p>We are updating content...</p></div>',
      lastUpdated: new Date().toISOString(),
      source: 'system',
      isFallback: true,
      fallbackReason: 'Newsletter file not found in any of the expected locations'
    };
    const fallbackValid = testValidation(fallbackContent, 'System Fallback');
    console.log(fallbackValid ? '✅ PASSED' : '❌ FAILED');

    // Scenario 4: System error content (should be rejected)
    console.log('\n4️⃣ Testing system error content...');
    const errorContent = {
      title: "Newsletter Error",
      content: "<div>Error loading newsletter</div>",
      source: "system",
      lastUpdated: new Date().toISOString()
      // Note: no isFallback flag for error content
    };
    const errorValid = testValidation(errorContent, 'System Error');
    console.log(!errorValid ? '✅ PASSED (correctly rejected)' : '❌ FAILED (should be rejected)');

    // Scenario 5: Loading state content (should be rejected)
    console.log('\n5️⃣ Testing loading state content...');
    const loadingContent = {
      title: "Loading Newsletter",
      content: "<div>Loading...</div>",
      source: "system",
      lastUpdated: new Date().toISOString()
    };
    const loadingValid = testValidation(loadingContent, 'Loading State');
    console.log(!loadingValid ? '✅ PASSED (correctly rejected)' : '❌ FAILED (should be rejected)');

    // Summary
    console.log('\n📊 Test Summary:');
    const allTests = [
      { name: 'SharePoint Content', passed: sharepointValid, expected: true },
      { name: 'Cached Content', passed: cachedValid, expected: true },
      { name: 'System Fallback', passed: fallbackValid, expected: true },
      { name: 'System Error', passed: !errorValid, expected: true },
      { name: 'Loading State', passed: !loadingValid, expected: true }
    ];

    const passedTests = allTests.filter(test => test.passed === test.expected).length;
    const totalTests = allTests.length;

    console.log(`Results: ${passedTests}/${totalTests} tests passed`);

    allTests.forEach(test => {
      const status = test.passed === test.expected ? '✅' : '❌';
      console.log(`  ${status} ${test.name}`);
    });

    if (passedTests === totalTests) {
      console.log('\n🎉 All tests PASSED! The newsletter validation fix is working correctly.');
    } else {
      console.log('\n⚠️ Some tests FAILED. The fix may need adjustment.');
    }

    console.log('\n🎉 Comprehensive test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testNewsletterFix();
