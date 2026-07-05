// --- ADMIN DASHBOARD SCRIPTS FOR CIVICCONNECT ---

const API_BASE_URL = 'http://localhost:5000/api';
const BACKEND_URL = 'http://localhost:5000';

// 1. Guard check: Verify that the user is logged in AND is an admin
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
  localStorage.clear();
  window.location.href = 'login.html';
} else if (user.role !== 'admin') {
  // If authenticated but not an admin, redirect them to the citizen dashboard
  window.location.href = 'dashboard.html';
}

// 2. Setup Welcome message
const welcomeMsg = document.getElementById('welcome-message');
if (welcomeMsg) {
  welcomeMsg.innerText = `Welcome, ${user.name} (Admin)`;
}

// 3. Handle Logout
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });
}

// Helper to show notifications
function showNotification(message, type = 'danger') {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.className = `alert alert-${type}`;
    alertBox.innerText = message;
    alertBox.style.display = 'block';
    
    // Auto-scroll to top to ensure visibility
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Hide alert after 3 seconds on success
    if (type === 'success') {
      setTimeout(() => {
        alertBox.style.display = 'none';
      }, 3500);
    }
  }
}

// --- VIEW & MANAGE ALL ISSUES ---
let currentStatusFilter = '';
let currentCategoryFilter = '';

async function fetchAdminIssues(status = '', category = '') {
  const adminIssuesContainer = document.getElementById('admin-issues-list');
  if (!adminIssuesContainer) return;
  
  adminIssuesContainer.innerHTML = `
    <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: var(--text-muted);">
      Loading civic issues...
    </div>
  `;
  
  try {
    let url = `${API_BASE_URL}/issues?`;
    if (status) url += `status=${status}&`;
    if (category) url += `category=${encodeURIComponent(category)}&`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch issues.');
    }
    
    const issues = await response.json();
    
    if (issues.length === 0) {
      adminIssuesContainer.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: var(--text-muted); background: var(--bg-glass); border: 1px dashed rgba(255,255,255,0.1); border-radius: 12px;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3>No reported issues found.</h3>
          <p style="margin-top: 0.5rem;">No active reports match the criteria.</p>
        </div>
      `;
      return;
    }
    
    adminIssuesContainer.innerHTML = issues.map(issue => {
      let badgeClass = 'badge-pending';
      if (issue.status === 'In Progress') badgeClass = 'badge-in-progress';
      if (issue.status === 'Resolved') badgeClass = 'badge-resolved';
      
      const reportDate = new Date(issue.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
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
            <span class="status-badge ${badgeClass}" id="badge-${issue.id}">${issue.status}</span>
          </div>
          <p class="issue-desc">${escapeHTML(issue.description)}</p>
          
          <div style="margin-bottom: 1.5rem;">
            <label class="form-label" style="font-weight: 600; margin-bottom: 0.3rem;">⚡ Update Action Status:</label>
            <select class="form-control status-select" data-id="${issue.id}" style="padding: 0.5rem; border-color: rgba(255,255,255,0.15); font-size: 0.9rem;">
              <option value="Pending" ${issue.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
              <option value="Resolved" ${issue.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            </select>
          </div>
          
          <div class="issue-meta">
            <div class="issue-meta-item">📁 <strong>Category:</strong> ${issue.category}</div>
            <div class="issue-meta-item">📍 <strong>Location:</strong> ${escapeHTML(issue.location)}</div>
            <div class="issue-meta-item">👤 <strong>Reporter:</strong> ${escapeHTML(issue.reporter_name)}</div>
            <div class="issue-meta-item">📅 <strong>Date:</strong> ${reportDate}</div>
          </div>
        </div>
      `;
    }).join('');
    
    // Attach change event listeners to all status dropdowns
    const statusSelects = document.querySelectorAll('.status-select');
    statusSelects.forEach(select => {
      select.addEventListener('change', async (e) => {
        const issueId = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        await updateStatus(issueId, newStatus, e.target);
      });
    });
    
  } catch (error) {
    showNotification(error.message);
  }
}

// Update status function (API call to PUT /api/issues/:id/status)
async function updateStatus(id, status, selectElement) {
  try {
    const response = await fetch(`${API_BASE_URL}/issues/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update status.');
    }
    
    showNotification(`Status updated to "${status}" successfully!`, 'success');
    
    // Dynamically update the badge on the UI without reloading the whole list
    const badge = document.getElementById(`badge-${id}`);
    if (badge) {
      badge.innerText = status;
      badge.className = 'status-badge'; // clear old status style
      
      // Apply new style
      if (status === 'Pending') badge.classList.add('badge-pending');
      if (status === 'In Progress') badge.classList.add('badge-in-progress');
      if (status === 'Resolved') badge.classList.add('badge-resolved');
    }
    
  } catch (error) {
    showNotification(error.message);
    // Revert select option to previous state if error occurred
    fetchAdminIssues(currentStatusFilter, currentCategoryFilter);
  }
}

// Escape HTML function to prevent XSS
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

// Event Listeners for Filters
const selectStatus = document.getElementById('filter-status');
const selectCategory = document.getElementById('filter-category');

if (selectStatus && selectCategory) {
  selectStatus.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    fetchAdminIssues(currentStatusFilter, currentCategoryFilter);
  });
  
  selectCategory.addEventListener('change', (e) => {
    currentCategoryFilter = e.target.value;
    fetchAdminIssues(currentStatusFilter, currentCategoryFilter);
  });
  
  // Trigger initial fetch
  fetchAdminIssues();
}
