// 4-auth-msal.js - Mock MSAL implementation for Viva Engage
console.log('[VivaEngage] 4-auth-msal.js loaded');

// Create a global variable to store our mock chunk
window.__vivaEngageMockChunk1278 = {
  id: 1278,
  loaded: true,
  exports: {},
  i: 1278,
  l: true,
  e: function() { return Promise.resolve(); },
  toString: function() { return 'Mock Chunk 1278'; }
};

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

window.fp = function() {
  console.log('[VivaEngage] Mock fp function called');
  return Promise.resolve();
};

// Register our chunk with webpack
if (window.webpackChunk) {
  window.webpackChunk.push([
    [1278],
    {},
    function(r) { console.log('[VivaEngage] Mock chunk 1278 loaded'); }
  ]);
}

// Export the MSAL module for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // CommonJS module system (Node.js)
  module.exports = window.msal;
} else if (typeof define === 'function' && define.amd) {
  // AMD module system (RequireJS)
  define('msal', [], function() { return window.msal; });
}

// Notify that the script has loaded successfully
console.log('[VivaEngage] 4-auth-msal.js initialization complete');
