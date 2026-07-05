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
    
    // Check if empty
    if (issues.length === 0) {
      issuesListContainer.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: var(--text-muted); background: var(--bg-glass); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3>No reported issues found.</h3>
          <p style="margin-top: 0.5rem;">Be the first to report an issue in your area!</p>
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
      
      // Check if image exists, otherwise show a nice colored card placeholder based on category
      const imageHTML = issue.image_url 
        ? `<img src="${BACKEND_URL}${issue.image_url}" alt="${issue.title}" class="issue-image">`
        : `<div style="width:100%; height:200px; border-radius:8px; margin-bottom:1.2rem; display:flex; flex-direction:column; align-items:center; justify-content:center; background: linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(20, 184, 166, 0.1) 100%); border: 1px dashed var(--border-glass); color: var(--text-muted);">
             <span style="font-size: 2.5rem; margin-bottom:0.5rem;">🏛️</span>
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
            <div class="issue-meta-item">📁 <strong>Category:</strong> ${issue.category}</div>
            <div class="issue-meta-item">📍 <strong>Location:</strong> ${escapeHTML(issue.location)}</div>
            <div class="issue-meta-item">👤 <strong>Reported By:</strong> ${escapeHTML(issue.reporter_name)}</div>
            <div class="issue-meta-item">📅 <strong>Date:</strong> ${reportDate}</div>
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
