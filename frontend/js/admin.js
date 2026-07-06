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
let currentDeletedFilter = 'false';

async function fetchAdminIssues(status = '', category = '', showDeleted = 'false') {
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
    if (showDeleted === 'true') url += `showDeleted=true&`;
    
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
    
    if (issues.length === 0) {
      adminIssuesContainer.innerHTML = `
        <div style="text-align: center; grid-column: 1 / -1; padding: 3rem; color: var(--text-muted); background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: 12px; box-shadow: var(--shadow-sm);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 1rem; opacity: 0.4;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <h3>No reported issues found.</h3>
          <p style="margin-top: 0.5rem; font-size: 0.95rem;">No active reports match the criteria.</p>
        </div>
      `;
      return;
    }
    
    adminIssuesContainer.innerHTML = issues.map(issue => {
      let badgeClass = 'badge-pending';
      if (issue.status === 'In Progress') badgeClass = 'badge-in-progress';
      if (issue.status === 'Resolved') badgeClass = 'badge-resolved';
      
      let priorityClass = 'priority-low';
      if (issue.priority === 'Medium') priorityClass = 'priority-medium';
      if (issue.priority === 'High') priorityClass = 'priority-high';
      if (issue.priority === 'Critical') priorityClass = 'priority-critical';
      
      const reportDate = new Date(issue.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
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

      // Audit Trail Info for deleted issues
      const auditHTML = issue.is_deleted === 1
        ? `<div style="background: rgba(239, 68, 68, 0.05); padding: 0.8rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.2); margin-bottom: 1.25rem; font-size: 0.825rem; line-height: 1.45;">
             <span style="color: hsl(0, 86%, 70%); font-weight: bold;">🗑️ Removed Audit Trail:</span><br>
             <strong>Reason:</strong> ${escapeHTML(issue.deletion_reason || 'No reason specified')}<br>
             <span style="color: var(--text-muted); font-size: 0.75rem;">Deleted at ${new Date(issue.deleted_at).toLocaleString()}</span>
           </div>`
        : '';

      // Action panel (Restore button for deleted issues, status select & delete button for active issues)
      const actionHTML = issue.is_deleted === 1
        ? `<div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; justify-content: flex-end;">
             <button type="button" class="btn btn-primary btn-restore" data-id="${issue.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; background-color: var(--status-resolved); box-shadow: 0 2px 6px rgba(16,185,129,0.2); border: none; display: flex; align-items: center; gap: 0.3rem; cursor: pointer; transition: var(--transition-smooth);">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: white;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
               Restore Ticket
             </button>
           </div>`
        : `<div style="margin-bottom: 1.25rem;">
             <label class="form-label" style="margin-bottom: 0.4rem;">Update Action Status:</label>
             <select class="form-control status-select" data-id="${issue.id}" style="padding: 0.5rem 2.5rem 0.5rem 1rem; font-size: 0.9rem;">
               <option value="Pending" ${issue.status === 'Pending' ? 'selected' : ''}>Pending</option>
               <option value="In Progress" ${issue.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
               <option value="Resolved" ${issue.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
             </select>
           </div>
           <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; justify-content: flex-end;">
             <button type="button" class="btn btn-secondary btn-delete-admin" data-id="${issue.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; border-color: rgba(239, 68, 68, 0.3); color: hsl(0, 86%, 70%); background: rgba(239, 68, 68, 0.03); display: flex; align-items: center; gap: 0.3rem; cursor: pointer; transition: var(--transition-smooth);">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: hsl(0, 86%, 70%);"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
               Delete Complaint (Spam/Abuse)
             </button>
           </div>`;
           
      return `
        <div class="card issue-card fade-in">
          ${imageHTML}
          <div class="issue-header">
            <h3 class="issue-title">${escapeHTML(issue.title)}</h3>
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <span class="priority-badge ${priorityClass}">${issue.priority || 'Medium'}</span>
              <span class="status-badge ${badgeClass}" id="badge-${issue.id}">${issue.status}</span>
            </div>
          </div>
          <p class="issue-desc">${escapeHTML(issue.description)}</p>
          
          ${auditHTML}
          ${actionHTML}
          
          <div class="issue-meta" style="margin-top: 1.25rem;">
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
              <span><strong>Reporter:</strong> ${escapeHTML(issue.reporter_name)}</span>
            </div>
            ${issue.latitude && issue.longitude ? `
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-color);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
              <span><strong>Coords:</strong> ${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}</span>
            </div>` : ''}
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span><strong>Date:</strong> ${reportDate}</span>
            </div>
            <div class="issue-meta-item" style="color: #10B981; font-weight: 600;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: rgba(16, 185, 129, 0.15);"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>${issue.support_count || 0} Citizens Supported</span>
            </div>
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

    // Attach click event listeners to admin delete buttons
    const deleteButtons = document.querySelectorAll('.btn-delete-admin');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const issueId = btn.getAttribute('data-id');
        const reason = prompt('Please enter the reason for removing this complaint (e.g. Spam, Duplicate content, Inappropriate language):');
        
        if (reason === null) return; // Cancelled
        if (!reason.trim()) {
          alert('You must provide a deletion reason for the audit trail.');
          return;
        }

        btn.innerText = 'Deleting...';
        btn.disabled = true;

        try {
          const res = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason.trim() })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Failed to delete issue.');

          showNotification('Complaint removed and logged successfully.', 'success');
          await fetchAdminIssues(currentStatusFilter, currentCategoryFilter, currentDeletedFilter);
        } catch (err) {
          showNotification(err.message, 'danger');
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: hsl(0, 86%, 70%);"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            Delete Complaint (Spam/Abuse)
          `;
          btn.disabled = false;
        }
      });
    });

    // Attach click event listeners to admin restore buttons
    const restoreButtons = document.querySelectorAll('.btn-restore');
    restoreButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const issueId = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to restore this complaint back to active status?')) {
          btn.innerText = 'Restoring...';
          btn.disabled = true;
          try {
            const res = await fetch(`${API_BASE_URL}/issues/${issueId}/restore`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to restore issue.');

            showNotification('Complaint ticket restored successfully.', 'success');
            await fetchAdminIssues(currentStatusFilter, currentCategoryFilter, currentDeletedFilter);
          } catch (err) {
            showNotification(err.message, 'danger');
            btn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; color: white;"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Restore Ticket
            `;
            btn.disabled = false;
          }
        }
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
    
    showNotification('Issue status updated successfully!', 'success');
    
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
    fetchAdminIssues(currentStatusFilter, currentCategoryFilter, currentDeletedFilter);
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
const selectDeleted = document.getElementById('filter-deleted');

if (selectStatus && selectCategory && selectDeleted) {
  selectStatus.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    fetchAdminIssues(currentStatusFilter, currentCategoryFilter, currentDeletedFilter);
  });
  
  selectCategory.addEventListener('change', (e) => {
    currentCategoryFilter = e.target.value;
    fetchAdminIssues(currentStatusFilter, currentCategoryFilter, currentDeletedFilter);
  });
  
  selectDeleted.addEventListener('change', (e) => {
    currentDeletedFilter = e.target.value;
    fetchAdminIssues(currentStatusFilter, currentCategoryFilter, currentDeletedFilter);
  });
  
  // Trigger initial fetch
  fetchAdminIssues(currentStatusFilter, currentCategoryFilter, currentDeletedFilter);
}
