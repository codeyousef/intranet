// Comprehensive Newsletter Debugging Script
console.log('🔍 Newsletter Issue Debugging Script');
console.log('===================================');

function debugNewsletterIssue() {
  console.log('\n📋 Step 1: Check Current State');
  console.log('------------------------------');
  
  // Check localStorage
  const newsletterData = localStorage.getItem('newsletterData');
  const newsletterLoaded = localStorage.getItem('newsletterLoaded');
  
  console.log('localStorage state:');
  console.log('  newsletterLoaded:', newsletterLoaded);
  
  if (newsletterData) {
    try {
      const parsed = JSON.parse(newsletterData);
      console.log('  newsletterData:', {
        title: parsed.title,
        source: parsed.source,
        isFallback: parsed.isFallback,
        contentLength: parsed.content?.length || 0,
        lastUpdated: parsed.lastUpdated
      });
      
      // Test validation logic
      console.log('\n🧪 Step 2: Test Validation Logic');
      console.log('--------------------------------');
      
      const isValid = 
        parsed &&
        parsed.content &&
        parsed.title !== "Loading Newsletter" &&
        parsed.title !== "Newsletter Error" &&
        parsed.title !== "Newsletter Temporarily Unavailable" &&
        parsed.title !== "Newsletter Service Temporarily Unavailable" &&
        parsed.source !== "system";
      
      console.log('Validation checks:');
      console.log('  hasNewsletter:', !!parsed);
      console.log('  hasContent:', !!parsed.content);
      console.log('  notLoadingTitle:', parsed.title !== "Loading Newsletter");
      console.log('  notErrorTitle:', parsed.title !== "Newsletter Error");
      console.log('  notTempUnavailableTitle:', parsed.title !== "Newsletter Temporarily Unavailable");
      console.log('  notServiceUnavailableTitle:', parsed.title !== "Newsletter Service Temporarily Unavailable");
      console.log('  notSystemSource:', parsed.source !== "system");
      console.log('  FINAL RESULT:', isValid);
      
      if (parsed.source === "system") {
        console.log('🚨 SYSTEM CONTENT DETECTED - This should be REJECTED!');
        if (isValid) {
          console.log('❌ BUG: System content is being marked as valid!');
        } else {
          console.log('✅ CORRECT: System content is being rejected');
        }
      }
      
    } catch (e) {
      console.log('  newsletterData: (invalid JSON)', e.message);
    }
  } else {
    console.log('  newsletterData: null');
  }
  
  console.log('\n🌐 Step 3: Test API Endpoint');
  console.log('----------------------------');
  
  console.log('Testing newsletter API...');
  fetch('/api/sharepoint/newsletter-list')
    .then(response => {
      console.log('API Response Status:', response.status, response.statusText);
      return response.json();
    })
    .then(data => {
      console.log('API Response Data:', {
        success: data.success,
        hasNewsletter: !!data.newsletter,
        hasFallbackContent: !!data.fallbackContent,
        error: data.error || 'none'
      });
      
      if (data.success && data.newsletter) {
        console.log('✅ API returned successful newsletter');
        console.log('Newsletter details:', {
          title: data.newsletter.title,
          source: data.newsletter.source,
          contentLength: data.newsletter.content?.length || 0
        });
      } else if (!data.success && data.fallbackContent) {
        console.log('⚠️ API returned error with fallback content');
        console.log('Fallback details:', {
          title: data.fallbackContent.title,
          source: data.fallbackContent.source,
          isFallback: data.fallbackContent.isFallback,
          contentLength: data.fallbackContent.content?.length || 0
        });
      } else {
        console.log('❌ API returned error without fallback');
        console.log('Error:', data.error);
      }
    })
    .catch(error => {
      console.log('❌ API call failed:', error.message);
    });
  
  console.log('\n🔧 Step 4: Recommended Actions');
  console.log('------------------------------');
  
  if (newsletterLoaded === 'true' && newsletterData) {
    try {
      const parsed = JSON.parse(newsletterData);
      if (parsed.source === "system") {
        console.log('🎯 ISSUE FOUND: System fallback content is cached');
        console.log('📝 SOLUTION: Clear the cache to force fresh fetch');
        console.log('   Run: localStorage.removeItem("newsletterData"); localStorage.removeItem("newsletterLoaded"); location.reload();');
      } else {
        console.log('✅ Cached content appears to be valid SharePoint content');
      }
    } catch (e) {
      console.log('🔧 Invalid cached data - clear cache recommended');
    }
  } else {
    console.log('ℹ️ No cached content - fresh fetch will be attempted');
  }
  
  console.log('\n🚀 Step 5: Force Fresh Fetch');
  console.log('----------------------------');
  console.log('To force a fresh fetch, run this in console:');
  console.log('localStorage.removeItem("newsletterData");');
  console.log('localStorage.removeItem("newsletterLoaded");');
  console.log('location.reload();');
}

// Run the debug
debugNewsletterIssue();