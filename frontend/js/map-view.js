// --- INTERACTIVE MAP VIEW FOR CIVICCONNECT ---

const API_BASE_URL = 'http://localhost:5000/api';
const BACKEND_URL = 'http://localhost:5000';

// 1. Guard check: Make sure user is authenticated
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
  localStorage.clear();
  window.location.href = 'login.html';
}

// 2. Populate TopBar user info on load
document.addEventListener('DOMContentLoaded', () => {
  const nameTop = document.getElementById('user-name-top');
  const roleTop = document.getElementById('user-role-top');
  const avatarEl = document.getElementById('user-avatar-placeholder');
  if (user) {
    if (nameTop) nameTop.innerText = user.name;
    if (roleTop) roleTop.innerText = user.role === 'admin' ? 'Administrator' : 'Verified Citizen';
    if (avatarEl) {
      avatarEl.innerText = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    }
  }
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }
});

// Helper to show alert messages
function showNotification(message, type = 'danger') {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.className = 'p-4 rounded-xl border text-sm font-semibold transition-all duration-300';
    if (type === 'success') {
      alertBox.classList.add('bg-green-50', 'text-green-800', 'border-green-200');
    } else {
      alertBox.classList.add('bg-red-50', 'text-red-800', 'border-red-200');
    }
    alertBox.innerText = message;
    alertBox.style.display = 'block';
  }
}

// --- MAP LOGIC ---
let map;
let markerGroup;
let allIssues = [];

function initMap() {
  // Default coordinates (Chandigarh region)
  const defaultLat = 30.7333;
  const defaultLng = 76.7794;

  map = L.map('community-map').setView([defaultLat, defaultLng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  markerGroup = L.layerGroup().addTo(map);
}

// Render issues on map
function renderMapMarkers(issues) {
  // Clear old markers first
  markerGroup.clearLayers();

  let activePinsCount = 0;
  let latSum = 0;
  let lngSum = 0;

  issues.forEach(issue => {
    if (issue.latitude && issue.longitude) {
      activePinsCount++;
      latSum += issue.latitude;
      lngSum += issue.longitude;

      // Status colors or priority markers
      let statusColor = '#EAB308'; // Yellow for In Progress
      if (issue.status === 'Pending') statusColor = '#3B82F6'; // Blue
      if (issue.status === 'Resolved') statusColor = '#10B981'; // Green

      // Create a colored SVG circle icon
      const customIcon = L.divIcon({
        className: 'custom-map-pin',
        html: `<div style="background-color: ${statusColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const reportDate = new Date(issue.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      // HTML for popup details
      const imageHTML = issue.image_url 
        ? `<img src="${BACKEND_URL}${issue.image_url}" style="width: 100%; max-height: 100px; object-fit: cover; border-radius: 6px; margin-top: 8px;">`
        : '';

      const priorityLabel = issue.priority || 'Medium';
      let priorityStyle = 'background: #F3F4F6; color: #4B5563;'; // Low/Medium Gray
      if (priorityLabel === 'High') priorityStyle = 'background: #FEE2E2; color: #DC2626; font-weight: 600;';
      if (priorityLabel === 'Critical') priorityStyle = 'background: #7F1D1D; color: #FFFFFF; font-weight: 600;';

      const popupContent = `
        <div style="font-family: inherit; font-size: 13px; max-width: 250px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
            <h4 style="margin: 0; font-size: 14px; color: var(--text-main); font-weight: 600;">${escapeHTML(issue.title)}</h4>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 9999px; ${priorityStyle}">${priorityLabel}</span>
          </div>
          <p style="margin: 0 0 6px 0; color: var(--text-muted); line-height: 1.4;">${escapeHTML(issue.description)}</p>
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; line-height: 1.5;">
            <strong style="color: var(--text-main);">Category:</strong> ${issue.category}<br>
            <strong style="color: var(--text-main);">Status:</strong> <span style="font-weight: 600; color: ${statusColor};">${issue.status}</span><br>
            <strong style="color: var(--text-main);">Location:</strong> ${escapeHTML(issue.location)}<br>
            <strong style="color: var(--text-main);">Date:</strong> ${reportDate}
          </div>
          ${imageHTML}
        </div>
      `;

      const marker = L.marker([issue.latitude, issue.longitude], { icon: customIcon })
        .bindPopup(popupContent);
      markerGroup.addLayer(marker);
    }
  });

  // Re-center map to the average location of pins if pins exist
  if (activePinsCount > 0) {
    const avgLat = latSum / activePinsCount;
    const avgLng = lngSum / activePinsCount;
    map.setView([avgLat, avgLng], 13);
  }
}

// Fetch all issues from backend API
async function fetchAllIssuesForMap() {
  try {
    const response = await fetch(`${API_BASE_URL}/issues`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to retrieve community complaints.');
    }

    allIssues = await response.json();
    renderMapMarkers(allIssues);
  } catch (err) {
    console.error(err);
    showNotification(err.message, 'danger');
  }
}

// Simple HTML escaping helper to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
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

// Listen to category filters
const filterCategory = document.getElementById('map-filter-category');
if (filterCategory) {
  filterCategory.addEventListener('change', (e) => {
    const selected = e.target.value;
    if (selected === '') {
      renderMapMarkers(allIssues);
    } else {
      const filtered = allIssues.filter(issue => issue.category === selected);
      renderMapMarkers(filtered);
    }
  });
}

// Initialize map on script load
initMap();
fetchAllIssuesForMap();
