// Mexty Extension - Background Service Worker
// Handles login, API relay, sync, context menu, and notifications

const API_BASE_URL = 'https://us-central1-mexty101.cloudfunctions.net/api';
const FIREBASE_CONFIG = {
  apiKey: null, // Will be fetched from backend
  authDomain: 'mexty101.firebaseapp.com',
  projectId: 'mexty101'
};

let authToken = null;
let userData = null;
let syncInterval = null;

// Initialize Extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Mexty Extension Installed:', details.reason);
  
  // Create context menu
  chrome.contextMenus.create({
    id: 'askMexty',
    title: "Ask Jerry's AI Twin",
    contexts: ['selection']
  });
  
  // Set up alarm for weekly sync
  chrome.alarms.create('weeklySync', {
    periodInMinutes: 10080 // 7 days = 10080 minutes
  });
  
  // Show welcome notification
  if (details.reason === 'install') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.png',
      title: 'Mexty Installed!',
      message: "Jerry's AI Twin is ready to assist you. Click the extension icon to get started."
    });
  }
});

// Handle Context Menu Clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'askMexty' && info.selectionText) {
    try {
      // Send selected text to Mexty
      const response = await sendToBackend('/chat', {
        message: `Context: "${info.selectionText}". What can you tell me about this?`,
        pageUrl: tab.url,
        pageTitle: tab.title
      });
      
      if (response.success) {
        // Show response in notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Mexty Says:',
          message: response.reply.substring(0, 200) + (response.reply.length > 200 ? '...' : '')
        });
      }
    } catch (error) {
      console.error('Error asking Mexty:', error);
    }
  }
});

// Handle Alarms (for periodic sync)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'weeklySync') {
    console.log('Running weekly sync...');
    await syncUserProfile();
  }
});

// Message Handler - Communication hub for popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      switch (request.action) {
        case 'getAuthToken':
          const token = await getAuthToken();
          sendResponse({ token });
          break;
          
        case 'login':
          const loginResult = await handleLogin(request.email, request.password);
          sendResponse(loginResult);
          break;
          
        case 'logout':
          await handleLogout();
          sendResponse({ success: true });
          break;
          
        case 'getUserData':
          sendResponse({ user: userData });
          break;
          
        case 'syncProfile':
          const syncResult = await syncUserProfile();
          sendResponse(syncResult);
          break;
          
        case 'getFormData':
          const formData = await getFormFillData();
          sendResponse({ success: true, data: formData });
          break;
          
        case 'notifyUser':
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon.png',
            title: request.title || 'Mexty',
            message: request.message
          });
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep message channel open for async response
});

// Authentication Functions
async function handleLogin(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    if (data.success) {
      authToken = data.token;
      userData = data.user;
      
      // Store in Chrome storage
      await chrome.storage.local.set({ 
        authToken: authToken,
        userData: userData 
      });
      
      // Start periodic sync
      startSyncInterval();
      
      return { success: true, user: userData };
    } else {
      return { success: false, error: data.error || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

async function handleLogout() {
  authToken = null;
  userData = null;
  
  // Clear storage
  await chrome.storage.local.remove(['authToken', 'userData']);
  
  // Stop sync interval
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

async function getAuthToken() {
  if (authToken) {
    return authToken;
  }
  
  // Try to retrieve from storage
  const storage = await chrome.storage.local.get(['authToken', 'userData']);
  
  if (storage.authToken) {
    authToken = storage.authToken;
    userData = storage.userData;
    startSyncInterval();
    return authToken;
  }
  
  // No token available - user needs to log in
  return null;
}

// API Communication
async function sendToBackend(endpoint, data = {}) {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  
  return await response.json();
}

// Profile Sync
async function syncUserProfile() {
  try {
    console.log('Syncing user profile...');
    
    const result = await sendToBackend('/sync-profile');
    
    if (result.success) {
      // Update local user data
      userData = result.userData;
      await chrome.storage.local.set({ userData });
      
      // Notify user
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Profile Synced',
        message: 'Your profile has been updated with the latest data from GitHub, LinkedIn, and Portfolio.'
      });
      
      return { success: true };
    } else {
      throw new Error(result.error || 'Sync failed');
    }
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  }
}

function startSyncInterval() {
  // Sync every 24 hours
  if (!syncInterval) {
    syncInterval = setInterval(() => {
      syncUserProfile();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

// Get Form Fill Data
async function getFormFillData() {
  try {
    const result = await sendToBackend('/get-profile-data');
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'Failed to get form data');
    }
  } catch (error) {
    console.error('Error getting form data:', error);
    return null;
  }
}

// Tab Updates - Detect job application pages
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if URL matches job application sites
    const jobSites = [
      'linkedin.com/jobs',
      'indeed.com',
      'glassdoor.com',
      'monster.com',
      'ziprecruiter.com',
      'angel.co',
      'wellfound.com'
    ];
    
    const isJobSite = jobSites.some(site => tab.url.includes(site));
    
    if (isJobSite) {
      // Inject content script if not already injected
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tabId },
          files: ['content.js']
        });
        
        // Show badge to indicate Mexty is active
        chrome.action.setBadgeText({ text: '✓', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#4ade80', tabId: tabId });
      } catch (error) {
        // Script might already be injected
        console.log('Content script injection skipped:', error.message);
      }
    }
  }
});

// Web Request Handling - Monitor for job applications
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    // Log job application submissions for tracking
    if (details.method === 'POST' && details.url.includes('apply')) {
      console.log('Job application detected:', details.url);
      
      // Store application in history
      chrome.storage.local.get(['applicationHistory'], (result) => {
        const history = result.applicationHistory || [];
        history.push({
          url: details.url,
          timestamp: Date.now(),
          tabId: details.tabId
        });
        
        chrome.storage.local.set({ applicationHistory: history });
      });
    }
  },
  { urls: ['<all_urls>'] },
  ['requestBody']
);

// Initialize on startup
(async () => {
  // Try to restore auth state
  const token = await getAuthToken();
  
  if (token) {
    console.log('Mexty Extension: Auth state restored');
  } else {
    console.log('Mexty Extension: No auth state found');
  }
})();

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  port.onDisconnect.addListener(() => {
    console.log('Port disconnected');
  });
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleLogin,
    handleLogout,
    getAuthToken,
    syncUserProfile,
    sendToBackend
  };
}
