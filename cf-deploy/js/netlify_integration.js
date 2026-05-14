/**
 * Netlify Functions Integration with GitHub Pages Fallback
 * Intelligent detection and fallback for LinkedIn automation
 */

// Detect if we're running on Netlify or GitHub Pages
const isNetlify = window.location.hostname.includes('netlify.app') || 
                  window.location.hostname === 'bluehawana.com';

const API_BASE_URL = isNetlify 
  ? `${window.location.origin}/api` 
  : null; // Fallback to static content only

/**
 * Enhanced LinkedIn sync with Netlify integration
 */
async function netlifyLinkedInSync() {
  if (!API_BASE_URL) {
    console.log('Running on GitHub Pages - using static LinkedIn content');
    return { success: true, source: 'static' };
  }

  try {
    showSyncStatus('Syncing LinkedIn posts...', 'info');
    
    const response = await fetch(`${API_BASE_URL}/linkedin-sync`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      showSyncStatus(`✅ Synced ${result.postsCount} LinkedIn posts`, 'success');
      
      // Refresh LinkedIn posts display
      if (typeof fetchLinkedInPosts === 'function') {
        fetchLinkedInPosts();
      }
      
      return result;
    } else {
      throw new Error(result.error || 'Sync failed');
    }
    
  } catch (error) {
    console.error('Netlify LinkedIn sync failed:', error);
    showSyncStatus(`❌ Sync failed: ${error.message}`, 'error');
    
    // Fallback to static content
    if (typeof fetchLinkedInPosts === 'function') {
      fetchLinkedInPosts();
    }
    
    return { success: false, error: error.message, fallback: 'static' };
  }
}

/**
 * Get automation status from Netlify
 */
async function getNetlifyAutomationStatus() {
  if (!API_BASE_URL) {
    return {
      netlify: { status: 'not_available' },
      linkedIn: { status: 'static_content' },
      gitHub: { status: 'static_content' },
      overall: 'static_mode'
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/automation-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Status check failed: ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('Status check failed:', error);
    return {
      error: error.message,
      netlify: { status: 'error' },
      overall: 'error'
    };
  }
}

/**
 * Manual GitHub update via Netlify
 */
async function netlifyGitHubUpdate(posts) {
  if (!API_BASE_URL) {
    console.log('GitHub Pages mode - no automatic updates available');
    return { success: false, reason: 'static_mode' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/github-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ posts })
    });

    const result = await response.json();
    
    if (result.success) {
      showSyncStatus(`✅ Updated GitHub with ${result.newPosts} new posts`, 'success');
    } else {
      throw new Error(result.error || 'GitHub update failed');
    }
    
    return result;
    
  } catch (error) {
    console.error('GitHub update failed:', error);
    showSyncStatus(`❌ GitHub update failed: ${error.message}`, 'error');
    return { success: false, error: error.message };
  }
}

/**
 * Show sync status messages
 */
function showSyncStatus(message, type = 'info') {
  // Create or update status element
  let statusEl = document.getElementById('sync-status');
  if (!statusEl) {
    statusEl = document.createElement('div');
    statusEl.id = 'sync-status';
    statusEl.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      font-family: monospace;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      transition: all 0.3s ease;
    `;
    document.body.appendChild(statusEl);
  }

  // Style based on type
  const styles = {
    info: { background: '#1a1a2e', color: '#00d4ff', border: '1px solid #00d4ff' },
    success: { background: '#1a2e1a', color: '#50fa7b', border: '1px solid #50fa7b' },
    error: { background: '#2e1a1a', color: '#ff7b72', border: '1px solid #ff7b72' }
  };

  Object.assign(statusEl.style, styles[type]);
  statusEl.textContent = message;
  statusEl.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (statusEl) {
      statusEl.style.opacity = '0';
      setTimeout(() => {
        if (statusEl && statusEl.parentNode) {
          statusEl.parentNode.removeChild(statusEl);
        }
      }, 300);
    }
  }, 5000);
}

/**
 * Initialize Netlify integration
 */
function initNetlifyIntegration() {
  console.log(`🚀 Platform detected: ${isNetlify ? 'Netlify' : 'GitHub Pages'}`);
  
  if (isNetlify) {
    console.log('✅ Netlify Functions enabled - LinkedIn automation available');
    
    // Add sync button to automation dashboard if present
    const dashboard = document.getElementById('automation-dashboard');
    if (dashboard) {
      addNetlifySyncButton();
    }
    
    // Auto-sync on page load (optional)
    // netlifyLinkedInSync();
    
  } else {
    console.log('📄 GitHub Pages mode - using static content only');
  }
}

/**
 * Add Netlify sync button to dashboard
 */
function addNetlifySyncButton() {
  const button = document.createElement('button');
  button.innerHTML = '🔄 Netlify Sync';
  button.className = 'btn-terminal';
  button.onclick = () => netlifyLinkedInSync();
  
  // Find control section and add button
  const controls = document.querySelector('.controls-section');
  if (controls) {
    controls.appendChild(button);
  }
}

/**
 * Enhanced automation dashboard integration
 */
async function updateAutomationDashboard() {
  const status = await getNetlifyAutomationStatus();
  
  // Update dashboard elements if they exist
  const updateElement = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  updateElement('systemStatus', status.overall);
  updateElement('linkedinAuth', status.linkedIn?.status || 'unknown');
  updateElement('githubStatus', status.gitHub?.status || 'unknown');
  
  if (status.netlify) {
    updateElement('platformStatus', status.netlify.status);
  }
}

// Global functions for backward compatibility
window.netlifyLinkedInSync = netlifyLinkedInSync;
window.getNetlifyAutomationStatus = getNetlifyAutomationStatus;
window.netlifyGitHubUpdate = netlifyGitHubUpdate;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initNetlifyIntegration);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    netlifyLinkedInSync,
    getNetlifyAutomationStatus,
    netlifyGitHubUpdate,
    isNetlify,
    API_BASE_URL
  };
}