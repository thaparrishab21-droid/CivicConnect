// --- CITIZEN DASHBOARD & REPORT SCRIPTS FOR CIVICCONNECT ---

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

// 2. Setup User name and details in TopBar & Welcome
document.addEventListener('DOMContentLoaded', () => {
  const nameTop = document.getElementById('user-name-top');
  const welcomeName = document.getElementById('welcome-name');
  const roleTop = document.getElementById('user-role-top');
  const avatarPlaceholder = document.getElementById('user-avatar-placeholder');
  
  if (user) {
    if (nameTop) nameTop.innerText = user.name;
    if (welcomeName) welcomeName.innerText = user.name.split(' ')[0] || user.name;
    if (roleTop) roleTop.innerText = user.role === 'admin' ? 'Administrator' : 'Verified Citizen';
    if (avatarPlaceholder) {
      const initials = user.name.split(' ').map(n=>n[0]).join('').slice(0, 2);
      avatarPlaceholder.innerText = initials;
    }
  }

  // Sidebar navigations
  const sidebarDashboard = document.getElementById('sidebar-dashboard');
  const sidebarMyIssues = document.getElementById('sidebar-my-issues');
  
  if (sidebarDashboard && sidebarMyIssues) {
    sidebarDashboard.addEventListener('click', () => {
      currentFilterMyReports = false;
      updateSidebarState();
      fetchIssues(currentFilterMyReports, currentCategoryFilter);
    });
    sidebarMyIssues.addEventListener('click', () => {
      currentFilterMyReports = true;
      updateSidebarState();
      fetchIssues(currentFilterMyReports, currentCategoryFilter);
    });
  }

  // Handle Logout
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  // Category filter dropdown change
  const selectCategory = document.getElementById('filter-category');
  if (selectCategory) {
    selectCategory.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      fetchIssues(currentFilterMyReports, currentCategoryFilter);
    });
  }

  // Search input filtering
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterAndRenderLocal(searchTerm);
    });
  }

  // Trigger initial fetch if on dashboard
  const issuesListContainer = document.getElementById('issues-list');
  if (issuesListContainer) {
    fetchIssues();
  }
});

// Helper to update sidebar UI active highlight state
function updateSidebarState() {
  const sidebarDashboard = document.getElementById('sidebar-dashboard');
  const sidebarMyIssues = document.getElementById('sidebar-my-issues');
  if (!sidebarDashboard || !sidebarMyIssues) return;
  
  if (currentFilterMyReports) {
    sidebarMyIssues.className = "flex items-center gap-3 px-4 py-3 bg-primary-container text-on-primary-container rounded-lg font-bold scale-95 transition-all cursor-pointer";
    sidebarDashboard.className = "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all cursor-pointer";
  } else {
    sidebarDashboard.className = "flex items-center gap-3 px-4 py-3 bg-primary-container text-on-primary-container rounded-lg font-bold scale-95 transition-all cursor-pointer";
    sidebarMyIssues.className = "flex items-center gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all cursor-pointer";
  }
}

// Helper to show alert messages on the page
function showNotification(message, type = 'danger') {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.className = `p-4 rounded-xl border mb-6 text-sm font-semibold flex items-center justify-between transition-all duration-300`;
    
    // Set appropriate styling based on type
    if (type === 'success') {
      alertBox.classList.add('bg-green-50', 'text-green-800', 'border-green-200');
    } else if (type === 'warning') {
      alertBox.classList.add('bg-yellow-50', 'text-yellow-800', 'border-yellow-200');
    } else {
      alertBox.classList.add('bg-red-50', 'text-red-800', 'border-red-200');
    }
    
    alertBox.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="material-symbols-outlined text-lg">${type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'error'}</span>
        <span>${message}</span>
      </div>
      <button onclick="document.getElementById('alert-box').style.display='none'" class="hover:opacity-70 material-symbols-outlined text-sm">close</button>
    `;
    alertBox.style.display = 'flex';
  }
}

// --- DASHBOARD: LIST AND FILTER ISSUES ---
let currentFilterMyReports = false;
let currentCategoryFilter = '';
let loadedIssues = [];

// Fetch and Render Issues list
async function fetchIssues(myIssues = false, category = '') {
  const issuesListContainer = document.getElementById('issues-list');
  if (!issuesListContainer) return; // Exit if not on dashboard page
  
  issuesListContainer.innerHTML = `
    <div class="p-8 text-center text-on-surface-variant">
      <span class="animate-pulse">Loading civic issues...</span>
    </div>
  `;
  
  try {
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
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }
      throw new Error('Failed to fetch issues.');
    }
    
    const issues = await response.json();
    loadedIssues = issues;
    
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

    // Update circular progress SVG for Resolution Rate
    const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
    const circleEl = document.getElementById('resolution-circle');
    const textEl = document.getElementById('resolution-rate-text');
    const trendEl = document.getElementById('resolution-rate-trend');
    
    if (circleEl) {
      const circumference = 364.4; // 2 * PI * 58
      const dashoffset = circumference * (1 - (resolutionRate / 100));
      circleEl.style.strokeDasharray = circumference;
      circleEl.style.strokeDashoffset = dashoffset;
    }
    if (textEl) {
      textEl.innerText = `${resolutionRate}%`;
    }
    if (trendEl) {
      const mockTrend = (resolutionRate * 0.08).toFixed(1);
      trendEl.innerText = `+${mockTrend}%`;
    }
    
    // Update welcome stats line
    const welcomeSub = document.getElementById('welcome-sub');
    if (welcomeSub) {
      welcomeSub.innerText = `Your contributions helped resolve ${resolvedCount} neighborhood issues in total.`;
    }

    renderIssuesList(issues);
    
  } catch (error) {
    showNotification(error.message);
  }
}

// Render dynamic rows
function renderIssuesList(issuesList) {
  const issuesListContainer = document.getElementById('issues-list');
  if (!issuesListContainer) return;
  
  if (issuesList.length === 0) {
    issuesListContainer.innerHTML = `
      <div class="p-8 text-center text-on-surface-variant flex flex-col items-center justify-center">
        <span class="material-symbols-outlined text-4xl text-outline mb-2">info</span>
        <p class="text-sm font-semibold">No reported issues found.</p>
      </div>
    `;
    return;
  }
  
  issuesListContainer.innerHTML = issuesList.map(issue => {
    // Determine status badge class
    let badgeClass = 'bg-orange-100 text-orange-800'; // Pending
    if (issue.status === 'In Progress') badgeClass = 'bg-blue-100 text-blue-800';
    if (issue.status === 'Resolved') badgeClass = 'bg-green-100 text-green-800';
    
    // Determine priority badge class
    let priorityClass = 'bg-slate-100 text-slate-700';
    if (issue.priority === 'Medium') priorityClass = 'bg-yellow-100 text-yellow-800';
    if (issue.priority === 'High') priorityClass = 'bg-red-100 text-red-800';
    if (issue.priority === 'Critical') priorityClass = 'bg-red-200 text-red-900 border border-red-300';
    
    const reportDate = new Date(issue.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    const imageHTML = issue.image_url 
      ? `<img src="${BACKEND_URL}${issue.image_url}" alt="${issue.title}" class="w-full h-full object-cover">`
      : `<div class="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400">
           <span class="material-symbols-outlined text-xl">image</span>
         </div>`;
         
    const isOwner = issue.user_id === user.id;
    const withdrawBtnHTML = isOwner
      ? `<button type="button" class="btn-withdraw px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 text-xs font-semibold flex items-center gap-1 transition-colors" data-id="${issue.id}">
           <span class="material-symbols-outlined text-xs">delete</span> Withdraw
         </button>`
      : `<button type="button" class="btn-support px-3 py-1.5 rounded-lg border border-primary-fixed text-primary hover:bg-primary-fixed/30 text-xs font-semibold flex items-center gap-1 transition-colors" data-id="${issue.id}">
           <span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">thumb_up</span> Support
         </button>`;
         
    return `
      <div class="p-6 flex gap-6 items-center hover:bg-surface-container-low transition-colors">
        <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-outline-variant">
          ${imageHTML}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start flex-wrap gap-2">
            <h4 class="text-body-md font-bold text-on-background truncate pr-4 text-base">${escapeHTML(issue.title)}</h4>
            <div class="flex gap-2">
              <span class="px-2.5 py-0.5 text-xs rounded-full font-bold ${priorityClass}">${issue.priority || 'Medium'}</span>
              <span class="px-2.5 py-0.5 text-xs rounded-full font-bold ${badgeClass}">${issue.status}</span>
            </div>
          </div>
          <p class="text-label-sm text-on-surface-variant text-xs mt-1">Reported ${reportDate} • Landmark: ${escapeHTML(issue.location)}</p>
          <p class="text-body-md mt-1 text-on-surface text-sm line-clamp-1">${escapeHTML(issue.description)}</p>
          <div class="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
            <span class="flex items-center gap-1 font-semibold text-green-600">
              <span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">thumb_up</span> ${issue.support_count || 0} supported
            </span>
            <span class="flex items-center gap-1">
              <span class="material-symbols-outlined text-xs">person</span> By: ${escapeHTML(issue.reporter_name)}
            </span>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2 shrink-0">
          ${withdrawBtnHTML}
        </div>
      </div>
    `;
  }).join('');
  
  bindWithdrawEvents();
  bindSupportEvents();
}

// Local search filter
function filterAndRenderLocal(searchTerm) {
  if (!searchTerm) {
    renderIssuesList(loadedIssues);
    return;
  }
  
  const filtered = loadedIssues.filter(issue => {
    return (
      issue.title.toLowerCase().includes(searchTerm) ||
      issue.description.toLowerCase().includes(searchTerm) ||
      issue.location.toLowerCase().includes(searchTerm) ||
      issue.category.toLowerCase().includes(searchTerm)
    );
  });
  
  renderIssuesList(filtered);
}

// Bind clicks for Support buttons
function bindSupportEvents() {
  document.querySelectorAll('.btn-support').forEach(btn => {
    btn.addEventListener('click', async () => {
      const issueId = btn.getAttribute('data-id');
      btn.disabled = true;
      btn.innerText = 'Supporting...';
      try {
        const response = await fetch(`${API_BASE_URL}/issues/${issueId}/support`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to upvote issue.');
        
        showNotification('Supported issue successfully!', 'success');
        fetchIssues(currentFilterMyReports, currentCategoryFilter);
      } catch (err) {
        showNotification(err.message, 'danger');
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined text-xs" style="font-variation-settings: 'FILL' 1;">thumb_up</span> Support`;
      }
    });
  });
}

// Bind clicks for Withdraw buttons
function bindWithdrawEvents() {
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
          await fetchIssues(currentFilterMyReports, currentCategoryFilter);
        } catch (err) {
          showNotification(err.message, 'danger');
          btn.disabled = false;
          btn.innerHTML = `<span class="material-symbols-outlined text-xs">delete</span> Withdraw`;
        }
      }
    });
  });
}

// HTML escaping helper
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
            
            warningCard.style.display = 'block';
            warningCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const supportBtn = document.getElementById('btn-support-existing');
            const forceBtn = document.getElementById('btn-force-submit');
            const cancelBtn = document.getElementById('btn-cancel-duplicate');
            
            const newSupportBtn = supportBtn.cloneNode(true);
            const newForceBtn = forceBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            
            supportBtn.parentNode.replaceChild(newSupportBtn, supportBtn);
            forceBtn.parentNode.replaceChild(newForceBtn, forceBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
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
            
            newForceBtn.addEventListener('click', async () => {
              warningCard.style.display = 'none';
              await submitReport(true);
            });
            
            newCancelBtn.addEventListener('click', () => {
              warningCard.style.display = 'none';
            });
          } else {
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

  const defaultLat = 30.7333;
  const defaultLng = 76.7794;

  reportMap = L.map('report-map').setView([defaultLat, defaultLng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(reportMap);

  setTimeout(() => {
    setLocation(defaultLat, defaultLng);
  }, 100);

  async function reverseGeocode(lat, lng) {
    const locationInput = document.getElementById('issue-location');
    if (!locationInput) return;
    
    locationInput.value = 'Fetching human-readable address...';
    
    try {
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
      locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  function setLocation(lat, lng) {
    document.getElementById('issue-lat').value = lat.toFixed(6);
    document.getElementById('issue-lng').value = lng.toFixed(6);
    const statusText = document.getElementById('gps-status');
    if (statusText) {
      statusText.innerText = 'Location pinned!';
      statusText.style.color = '#10B981';
    }

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
      }
    ];

    for (const api of apis) {
      try {
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
        console.warn(`API failed:`, err.message);
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
      gpsStatus.style.color = 'inherit';

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
