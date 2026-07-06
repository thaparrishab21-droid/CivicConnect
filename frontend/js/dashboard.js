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
      
      // Determine priority badge class
      let priorityClass = 'priority-low';
      if (issue.priority === 'Medium') priorityClass = 'priority-medium';
      if (issue.priority === 'High') priorityClass = 'priority-high';
      if (issue.priority === 'Critical') priorityClass = 'priority-critical';
      
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
            <div style="display: flex; gap: 0.4rem; align-items: center;">
              <span class="priority-badge ${priorityClass}">${issue.priority || 'Medium'}</span>
              <span class="status-badge ${badgeClass}">${issue.status}</span>
            </div>
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
            ${issue.latitude && issue.longitude ? `
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary-color);"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
              <span><strong>Coords:</strong> ${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}</span>
            </div>` : ''}
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span><strong>By:</strong> ${escapeHTML(issue.reporter_name)}</span>
            </div>
            <div class="issue-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span><strong>Date:</strong> ${reportDate}</span>
            </div>
            <div class="issue-meta-item" style="color: #10B981; font-weight: 600;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: rgba(16, 185, 129, 0.15);"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span>${issue.support_count || 0} Citizens Supported</span>
            </div>
          </div>
          ${issue.user_id === user.id ? `
          <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem; display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-withdraw" data-id="${issue.id}" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; display: flex; align-items: center; gap: 0.3rem; border-color: rgba(239, 68, 68, 0.3); color: hsl(0, 86%, 70%); background: rgba(239, 68, 68, 0.03); cursor: pointer; transition: var(--transition-smooth);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: hsl(0, 86%, 70%);"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Withdraw Complaint
            </button>
          </div>` : ''}
        </div>
      `;
    }).join('');

    // Bind click events for withdraw buttons
    document.querySelectorAll('.btn-withdraw').forEach(btn => {
      btn.addEventListener('click', async () => {
        const issueId = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to withdraw this complaint? This action cannot be undone.')) {
          btn.innerText = 'Withdrawing...';
          btn.disabled = true;
          try {
            const response = await fetch(`${API_BASE_URL}/issues/${issueId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to withdraw complaint.');
            
            showNotification('Complaint withdrawn successfully!', 'success');
            // Refresh list dynamically
            await fetchIssues(currentFilterMyReports, currentCategoryFilter);
          } catch (err) {
            showNotification(err.message, 'danger');
            btn.innerHTML = `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 14px; height: 14px; color: hsl(0, 86%, 70%);"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Withdraw Complaint
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

// --- REPORT ISSUE FORM SUBMISSION & DUPLICATE LOGIC ---
const reportForm = document.getElementById('report-form');
if (reportForm) {
  async function submitReport(forceSubmit = false) {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.innerText = forceSubmit ? 'Submitting anyway...' : 'Submitting Report...';
    submitBtn.disabled = true;

    const title = document.getElementById('issue-title').value;
    const description = document.getElementById('issue-desc').value;
    const category = document.getElementById('issue-category').value;
    const priority = document.getElementById('issue-priority').value;
    const location = document.getElementById('issue-location').value;
    const lat = document.getElementById('issue-lat').value;
    const lng = document.getElementById('issue-lng').value;
    const imageFile = document.getElementById('issue-image').files[0];

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('priority', priority);
    formData.append('location', location);
    if (lat) formData.append('latitude', lat);
    if (lng) formData.append('longitude', lng);
    if (forceSubmit) formData.append('forceSubmit', 'true');
    if (imageFile) {
      formData.append('image', imageFile);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle duplicate detection (HTTP 409 Conflict)
        if (response.status === 409 && data.isDuplicate) {
          submitBtn.innerText = 'Submit Report';
          submitBtn.disabled = false;
          
          const warningCard = document.getElementById('duplicate-warning-card');
          if (warningCard) {
            document.getElementById('dup-title').innerText = data.duplicate.title;
            document.getElementById('dup-desc').innerText = data.duplicate.description;
            
            const distanceM = data.duplicate.distance_meters !== undefined ? Math.round(data.duplicate.distance_meters) : 
                              (data.duplicate.distance !== undefined ? Math.round(data.duplicate.distance) : null);
            
            document.getElementById('dup-location').innerHTML = `📍 ${data.duplicate.location}`;
            document.getElementById('dup-distance').innerHTML = distanceM !== null ? `📏 ${distanceM}m away` : '';
            
            // Display and focus warning card
            warningCard.style.display = 'block';
            warningCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const supportBtn = document.getElementById('btn-support-existing');
            const forceBtn = document.getElementById('btn-force-submit');
            const cancelBtn = document.getElementById('btn-cancel-duplicate');
            
            // Clone buttons to strip old click listeners cleanly
            const newSupportBtn = supportBtn.cloneNode(true);
            const newForceBtn = forceBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            
            supportBtn.parentNode.replaceChild(newSupportBtn, supportBtn);
            forceBtn.parentNode.replaceChild(newForceBtn, forceBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            // Action 1: Support / Upvote
            newSupportBtn.addEventListener('click', async () => {
              newSupportBtn.innerText = 'Upvoting...';
              newSupportBtn.disabled = true;
              try {
                const supportRes = await fetch(`${API_BASE_URL}/issues/${data.duplicate.id}/support`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                const supportData = await supportRes.json();
                if (!supportRes.ok) throw new Error(supportData.message || 'Failed to upvote issue.');
                
                showNotification('You have successfully supported this issue! Redirecting to dashboard...', 'success');
                setTimeout(() => {
                  window.location.href = 'dashboard.html';
                }, 2000);
              } catch (err) {
                showNotification(err.message, 'danger');
                newSupportBtn.innerText = '👍 Upvote & Support Existing';
                newSupportBtn.disabled = false;
              }
            });
            
            // Action 2: Report Anyway
            newForceBtn.addEventListener('click', async () => {
              warningCard.style.display = 'none';
              await submitReport(true);
            });
            
            // Action 3: Cancel
            newCancelBtn.addEventListener('click', () => {
              warningCard.style.display = 'none';
            });
          } else {
            // Fallback for missing elements
            if (confirm(`A similar issue was reported nearby:\n"${data.duplicate.title}"\nDo you want to report anyway?`)) {
              await submitReport(true);
            }
          }
          return;
        }
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
  }

  reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitReport(false);
  });
}

// --- REPORT PAGE MAP & AI ASSIST INITIALIZATION ---
let reportMap;
let reportMarker;

function initReportMap() {
  const mapContainer = document.getElementById('report-map');
  if (!mapContainer) return;

  // Default coordinates (Chandigarh region)
  const defaultLat = 30.7333;
  const defaultLng = 76.7794;

  reportMap = L.map('report-map').setView([defaultLat, defaultLng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(reportMap);

  // Set default pin at Chandigarh on load
  setTimeout(() => {
    setLocation(defaultLat, defaultLng);
  }, 100);

  // Helper to reverse geocode lat/lng to human-readable address
  async function reverseGeocode(lat, lng) {
    const locationInput = document.getElementById('issue-location');
    if (!locationInput) return;
    
    locationInput.value = 'Fetching human-readable address...';
    
    try {
      // Nominatim reverse lookup (CORS friendly, free for students/demos)
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
        headers: {
          'Accept-Language': 'en'
        }
      });
      if (!response.ok) throw new Error('Address lookup failed');
      const data = await response.json();
      
      if (data.display_name) {
        locationInput.value = data.display_name;
      } else {
        locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`; // Fallback to raw coords
    }
  }

  function setLocation(lat, lng) {
    document.getElementById('issue-lat').value = lat.toFixed(6);
    document.getElementById('issue-lng').value = lng.toFixed(6);
    document.getElementById('gps-status').innerText = 'Location pinned!';
    document.getElementById('gps-status').style.color = '#10B981';

    if (reportMarker) {
      reportMarker.setLatLng([lat, lng]);
    } else {
      reportMarker = L.marker([lat, lng], { draggable: true }).addTo(reportMap);
      reportMarker.on('dragend', function (event) {
        const marker = event.target;
        const position = marker.getLatLng();
        setLocation(position.lat, position.lng);
      });
    }
    reportMap.setView([lat, lng], 15);
    reverseGeocode(lat, lng);
  }

  reportMap.on('click', function (e) {
    setLocation(e.latlng.lat, e.latlng.lng);
  });

  async function fallbackToIPLocation(statusElement) {
    const apis = [
      {
        url: 'https://freeipapi.com/api/json',
        parse: (data) => {
          if (data.latitude && data.longitude) {
            return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), city: data.cityName };
          }
          return null;
        }
      },
      {
        url: 'https://ipapi.co/json/',
        parse: (data) => {
          if (data.latitude && data.longitude) {
            return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), city: data.city };
          }
          return null;
        }
      },
      {
        url: 'https://ipinfo.io/json',
        parse: (data) => {
          if (data.loc) {
            const [lat, lng] = data.loc.split(',');
            return { lat: parseFloat(lat), lng: parseFloat(lng), city: data.city };
          }
          return null;
        }
      }
    ];

    for (const api of apis) {
      try {
        console.log(`Trying IP Geolocation fallback via: ${api.url}`);
        const response = await fetch(api.url);
        if (!response.ok) continue;
        const data = await response.json();
        const result = api.parse(data);
        if (result && !isNaN(result.lat) && !isNaN(result.lng)) {
          setLocation(result.lat, result.lng);
          statusElement.innerText = `Location pinned! (Approx IP: ${result.city || 'Local'})`;
          statusElement.style.color = '#10B981';
          return;
        }
      } catch (err) {
        console.warn(`API ${api.url} failed:`, err.message);
      }
    }

    statusElement.innerText = 'GPS & IP detection failed. Please click map directly.';
    statusElement.style.color = '#EF4444';
  }

  const gpsBtn = document.getElementById('btn-detect-gps');
  if (gpsBtn) {
    gpsBtn.addEventListener('click', async () => {
      const gpsStatus = document.getElementById('gps-status');
      gpsStatus.innerText = 'Detecting...';
      gpsStatus.style.color = 'var(--text-muted)';

      if (window.location.protocol === 'file:') {
        gpsStatus.innerText = 'Browser blocked GPS on file://. Trying IP fallback...';
        await fallbackToIPLocation(gpsStatus);
        return;
      }

      if (!navigator.geolocation) {
        gpsStatus.innerText = 'Geolocation unsupported. Trying IP fallback...';
        await fallbackToIPLocation(gpsStatus);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLocation(lat, lng);
        },
        async (error) => {
          console.error("GPS detection error, using IP fallback:", error);
          gpsStatus.innerText = 'GPS failed. Trying IP fallback...';
          await fallbackToIPLocation(gpsStatus);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }
}

function initAIAssist() {
  const aiBtn = document.getElementById('ai-assist-btn');
  const descTextarea = document.getElementById('issue-desc');

  if (!aiBtn || !descTextarea) return;

  aiBtn.addEventListener('click', async () => {
    const rawText = descTextarea.value.trim();
    if (!rawText) {
      showNotification('Please enter some description details first so the AI can analyze it.', 'warning');
      return;
    }

    aiBtn.innerText = '✨ Analyzing...';
    aiBtn.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/issues/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: rawText })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'AI Analysis failed.');
      }

      descTextarea.value = data.rewrittenText;

      const categorySelect = document.getElementById('issue-category');
      if (categorySelect) {
        for (let option of categorySelect.options) {
          if (option.value.toLowerCase() === data.category.toLowerCase() || 
              (data.category === 'Garbage Dump' && option.value === 'Garbage Dump')) {
            categorySelect.value = option.value;
            break;
          }
        }
      }

      const prioritySelect = document.getElementById('issue-priority');
      if (prioritySelect) {
        prioritySelect.value = data.priority;
      }

      showNotification('AI analysis complete! Auto-filled category, priority, and structured text.', 'success');
    } catch (err) {
      console.error(err);
      showNotification(err.message, 'danger');
    } finally {
      aiBtn.innerText = '✨ AI Assist';
      aiBtn.disabled = false;
    }
  });
}

// Auto init when document loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initReportMap();
    initAIAssist();
  });
} else {
  initReportMap();
  initAIAssist();
}
