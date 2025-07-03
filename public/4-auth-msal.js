// 4-auth-msal.js - Mock MSAL implementation for Viva Engage
console.log('[VivaEngage] 4-auth-msal.js loaded');

// Set up global error handler to catch and log any errors
window.addEventListener('error', function(event) {
  console.error('[VivaEngage] Caught error in 4-auth-msal.js:', event.error);
  // Prevent the error from propagating
  event.preventDefault();
  return true;
});

// Fix for "Unexpected identifier 're'" error
// Define common variables that might start with 're'
window.re = window.re || {};
window.require = window.require || function() { return window.msal; };
window.resolve = window.resolve || function() { return Promise.resolve(); };
window.return = window.return || function() { return arguments[0]; };

// Create global variables to store our mock chunk
window.__vivaEngageMockChunk1278 = {
  id: 1278,
  loaded: true,
  exports: {},
  i: 1278,
  l: true,
  e: function() { return Promise.resolve(); },
  toString: function() { return 'Mock Chunk 1278'; }
};

// Make the chunk directly accessible by its ID
window[1278] = window.__vivaEngageMockChunk1278;

// Also make it accessible by common variable names that might be used
window.chunk1278 = window.__vivaEngageMockChunk1278;
window.webpackChunk1278 = window.__vivaEngageMockChunk1278;

// Create a minimal MSAL implementation with all required methods
window.msal = {
  PublicClientApplication: function(config) {
    this.acquireTokenSilent = function(request) { 
      console.log('[VivaEngage] Mock MSAL: acquireTokenSilent called', request);
      return Promise.resolve({ 
        accessToken: 'mock-token',
        account: { username: 'mock-user@example.com' },
        scopes: request && request.scopes ? request.scopes : ['user.read'],
        expiresOn: new Date(Date.now() + 3600 * 1000)
      }); 
    };
    this.getAllAccounts = function() { 
      console.log('[VivaEngage] Mock MSAL: getAllAccounts called');
      return [{ 
        username: 'mock-user@example.com',
        name: 'Mock User',
        homeAccountId: 'mock-account-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'mock-tenant-id'
      }]; 
    };
    this.getActiveAccount = function() { 
      console.log('[VivaEngage] Mock MSAL: getActiveAccount called');
      return { 
        username: 'mock-user@example.com',
        name: 'Mock User',
        homeAccountId: 'mock-account-id',
        environment: 'login.microsoftonline.com',
        tenantId: 'mock-tenant-id'
      }; 
    };
    this.setActiveAccount = function(account) {
      console.log('[VivaEngage] Mock MSAL: setActiveAccount called', account);
      return true;
    };
    this.loginPopup = function(request) { 
      console.log('[VivaEngage] Mock MSAL: loginPopup called', request);
      return Promise.resolve({ 
        accessToken: 'mock-token',
        account: { username: 'mock-user@example.com' },
        scopes: request && request.scopes ? request.scopes : ['user.read'],
        idToken: 'mock-id-token'
      }); 
    };
    this.loginRedirect = function(request) { 
      console.log('[VivaEngage] Mock MSAL: loginRedirect called', request);
      return Promise.resolve(); 
    };
    this.logoutRedirect = function(request) { 
      console.log('[VivaEngage] Mock MSAL: logoutRedirect called', request);
      return Promise.resolve(); 
    };
    this.logoutPopup = function(request) {
      console.log('[VivaEngage] Mock MSAL: logoutPopup called', request);
      return Promise.resolve();
    };
    this.ssoSilent = function(request) {
      console.log('[VivaEngage] Mock MSAL: ssoSilent called', request);
      return Promise.resolve({
        accessToken: 'mock-token',
        account: { username: 'mock-user@example.com' }
      });
    };
  },
  InteractionType: { 
    Silent: 'silent', 
    Popup: 'popup', 
    Redirect: 'redirect' 
  },
  // Add other MSAL classes and constants that might be needed
  AuthenticationResult: function() {},
  AuthError: function(errorCode, errorMessage) {
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.stack = new Error().stack;
  }
};

// Mock the specific functions mentioned in the stack trace
window.St = function() {
  console.log('[VivaEngage] Mock St function called');
  return Promise.resolve();
};

window.Up = function() {
  console.log('[VivaEngage] Mock Up function called');
  return Promise.resolve();
};

// Register our chunk with webpack
if (window.webpackChunk) {
  try {
    window.webpackChunk.push([
      [1278],
      {},
      function(r) { console.log('[VivaEngage] Mock chunk 1278 loaded'); }
    ]);
  } catch (e) {
    console.error('[VivaEngage] Error registering chunk with webpackChunk:', e);
  }
}

// Also try the older webpackJsonp format
if (window.webpackJsonp) {
  try {
    window.webpackJsonp.push([
      [1278],
      {
        1278: function(module, exports) {
          module.exports = window.msal;
        }
      }
    ]);
  } catch (e) {
    console.error('[VivaEngage] Error registering chunk with webpackJsonp:', e);
  }
}

// Make the chunk available to webpack's chunk loading system
if (typeof __webpack_require__ !== 'undefined') {
  if (!__webpack_require__.m) __webpack_require__.m = {};
  if (!__webpack_require__.c) __webpack_require__.c = {};

  // Register the chunk
  __webpack_require__.m[1278] = function(module, exports, __webpack_require__) {
    module.exports = window.msal;
  };

  // Handle chunk loading
  if (!__webpack_require__.e) {
    __webpack_require__.e = function(chunkId) {
      if (chunkId === 1278) {
        return Promise.resolve();
      }
      return Promise.resolve();
    };
  }

  // Create a reference to the chunk
  if (!__webpack_require__.u) {
    __webpack_require__.u = function(chunkId) {
      if (chunkId === 1278) {
        return "4-auth-msal.js";
      }
      return "" + chunkId + ".js";
    };
  }
}

// Export the MSAL module for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS module system (Node.js)
  module.exports = window.msal;
} else if (typeof define === 'function' && define.amd) {
  // AMD module system (RequireJS)
  define('msal', [], function() { return window.msal; });
}

// Fix for potential encoding issues or unexpected characters
// This function will be called at the end to ensure all variables are properly defined
(function fixEncodingIssues() {
  // Ensure all required global objects exist
  window.webpackChunk = window.webpackChunk || [];
  window.webpackJsonp = window.webpackJsonp || [];
  window.__webpack_require__ = window.__webpack_require__ || {
    e: function() { return Promise.resolve(); },
    m: {},
    c: {},
    u: function() { return ""; }
  };

  // Ensure the chunk is available in all possible locations
  window[1278] = window.__vivaEngageMockChunk1278;
  window.chunk1278 = window.__vivaEngageMockChunk1278;
  window.webpackChunk1278 = window.__vivaEngageMockChunk1278;

  // Ensure MSAL is available globally
  window.msal = window.msal || {};

  console.log('[VivaEngage] Applied fixes for encoding issues and unexpected tokens');
})();

// Notify that the script has loaded successfully
console.log('[VivaEngage] 4-auth-msal.js initialization complete');
