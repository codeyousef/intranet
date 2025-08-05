// Script to clear newsletter cache and force fresh fetch
console.log('🧹 Clearing Newsletter Cache and Forcing Fresh Fetch');
console.log('==================================================');

function clearNewsletterCache() {
  try {
    // Check what's currently in localStorage
    const currentData = localStorage.getItem('newsletterData');
    const currentLoaded = localStorage.getItem('newsletterLoaded');
    
    console.log('📋 Current localStorage state:');
    console.log('newsletterLoaded:', currentLoaded);
    
    if (currentData) {
      try {
        const parsed = JSON.parse(currentData);
        console.log('newsletterData:', {
          title: parsed.title,
          source: parsed.source,
          isFallback: parsed.isFallback,
          contentLength: parsed.content?.length || 0,
          lastUpdated: parsed.lastUpdated
        });
      } catch (e) {
        console.log('newsletterData: (invalid JSON)', currentData.substring(0, 100));
      }
    } else {
      console.log('newsletterData: null');
    }
    
    // Clear the cache
    console.log('\n🗑️ Clearing newsletter cache...');
    localStorage.removeItem('newsletterData');
    localStorage.removeItem('newsletterLoaded');
    
    console.log('✅ Cache cleared successfully');
    
    // Force a page reload to trigger fresh fetch
    console.log('\n🔄 Reloading page to trigger fresh fetch...');
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
}

// Run the function
clearNewsletterCache();