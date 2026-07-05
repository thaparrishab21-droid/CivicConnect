// --- CITIZEN DASHBOARD & REPORT SCRIPTS ---

const API_BASE_URL = 'http://localhost:5000/api';
const BACKEND_URL = 'http://localhost:5000'; // For static image viewing

// 1. Guard check: Make sure user is authenticated
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
  // If not authenticated, boot them back to login page
  localStorage.clear();
  window.location.href = 'login.html';
}

// 2. Setup Welcome name
const welcomeMsg = document.getElementById('welcome-message');
if (welcomeMsg) {
  welcomeMsg.innerText = `Welcome, ${user.name}`;
}

// 3. Handle Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

// Helper to show alert messages
function showNotification(message, type = 'danger') {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.className = `alert alert-${type}`;
    alertBox.innerText = message;
    alertBox.style.display = 'block';
  }
}

// --- DASHBOARD: LIST AND FILTER ISSUES ---
let currentFilterMyReports = false;
let currentCategoryFilter = '';

// Fetch and Render Issues list
async function fetchIssues(myIssues = false, category = '') {
  const issuesListContainer = document.getElementById('issues-list');
  if (!issuesListContainer) return; // Exit if not on dashboard page
  
  issuesListContainer.innerHTML = `
    <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: var(--text-muted);">
      Loading civic issues...
    </div>
  `;
  
  try {
    // Build query URL with query parameters
    let url = `${API_BASE_URL}/issues?`;
    if (myIssues) url += `myIssues=true&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        // Token expired or invalid, force logout
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Failed to fetch issues.');
    }
    
    const issues = await response.json();
    
    // Calculate and render stats metrics dynamically
    const totalCount = issues.length;
    const pendingCount = issues.filter(i => i.status === 'Pending').length;
    const progressCount = issues.filter(i => i.status === 'In Progress').length;
    const resolvedCount = issues.filter(i => i.status === 'Resolved').length;
    
    const statsTotal = document.getElementById('stats-total');
    const statsPending = document.getElementById('stats-pending');
    const statsProgress = document.getElementById('stats-progress');
    const statsResolved = document.getElementById('stats-resolved');
    
    if (statsTotal) statsTotal.innerText = totalCount;
    if (statsPending) statsPending.innerText = pendingCount;
    if (statsProgress) statsProgress.innerText = progressCount;
    if (statsResolved) statsResolved.innerText = resolvedCount;
    
    // Check if empty
    if (issues.length === 0) {
      issuesListContainer.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: var(--text-muted); background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: 12px; box-shadow: var(--shadow-sm);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1rem; opacity: 0.4;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No reported issues found.</h3>
          <p style="margin-top: 0.5rem; font-size: 0.95rem;">Be the first to report an issue in your area!</p>
        </div>
      `;
      return;
    }
    
    // Render issues dynamically
    issuesListContainer.innerHTML = issues.map(issue => {
      // Determine status badge class
      let badgeClass = 'badge-pending';
      if (issue.status === 'In Progress') badgeClass = 'badge-in-progress';
      if (issue.status === 'Resolved') badgeClass = 'badge-resolved';
      
      // Format reported date
      const reportDate = new Date(issue.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      // Check if image exists, otherwise show a nice custom vector placeholder
      const imageHTML = issue.image_url 
        ? `<img src="${BACKEND_URL}${issue.image_url}" alt="${issue.title}" class="issue-image">`
        : `<div class="issue-placeholder-img">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
               <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
               <line x1="12" y1="22.08" x2="12" y2="12"></line>
             </svg>
             <span>No photo uploaded</span>
           </div>`;
           
      return `
        <div class="card issue-card fade-in">
          ${imageHTML}
          <div class="issue-header">
            <h3 class="issue-title">${escapeHTML(issue.title)}</h3>
            <span class="status-badge ${badgeClass}">${issue.status}</span>
          </div>
          <p class="issue-desc">${escapeHTML(issue.description)}</p>
          <div class="issue-meta">
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <span><strong>Category:</strong> ${issue.category}</span>
            </div>
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span><strong>Location:</strong> ${escapeHTML(issue.location)}</span>
            </div>
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span><strong>By:</strong> ${escapeHTML(issue.reporter_name)}</span>
            </div>
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span><strong>Date:</strong> ${reportDate}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    showNotification(error.message);
  }
}

// Simple HTML escaping helper to prevent XSS attacks (Cross-site Scripting)
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Set up dashboard event listeners
const btnAll = document.getElementById('filter-all');
const btnMy = document.getElementById('filter-my');
const selectCategory = document.getElementById('filter-category');

if (btnAll && btnMy && selectCategory) {
  // All Issues click
  btnAll.addEventListener('click', () => {
    currentFilterMyReports = false;
    btnAll.className = 'btn btn-primary';
    btnMy.className = 'btn btn-secondary';
    fetchIssues(currentFilterMyReports, currentCategoryFilter);
  });
  
  // My Reports click
  btnMy.addEventListener('click', () => {
    currentFilterMyReports = true;
    btnAll.className = 'btn btn-secondary';
    btnMy.className = 'btn btn-primary';
    fetchIssues(currentFilterMyReports, currentCategoryFilter);
  });
  
  // Category change
  selectCategory.addEventListener('change', (e) => {
    currentCategoryFilter = e.target.value;
    fetchIssues(currentFilterMyReports, currentCategoryFilter);
  });
  
  // Trigger initial fetch
  fetchIssues();
}

// --- REPORT ISSUE FORM SUBMISSION ---
const reportForm = document.getElementById('report-form');
if (reportForm) {
  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = 'Submitting Report...';
    submitBtn.disabled = true;
    
    const title = document.getElementById('issue-title').value;
    const description = document.getElementById('issue-desc').value;
    const category = document.getElementById('issue-category').value;
    const location = document.getElementById('issue-location').value;
    const imageFile = document.getElementById('issue-image').files[0];
    
    // Create FormData instance to handle files & text inputs
    // We CANNOT send standard JSON since we are uploading an image file
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('location', location);
    
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}` // JWT token goes here
          // NOTE: DO NOT set 'Content-Type' header! The browser will automatically set the correct boundary when using FormData
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit report.');
      }
      
      showNotification('Report submitted successfully! Redirecting back to dashboard...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
      
    } catch (error) {
      showNotification(error.message);
      submitBtn.innerText = 'Submit Report';
      submitBtn.disabled = false;
    }
  });
}
