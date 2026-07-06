// --- ANALYTICS DASHBOARD CONTROLLER FOR CIVICCONNECT ---

const API_BASE_URL = 'http://localhost:5000/api';

// Configure Chart.js global defaults for dark theme visibility
if (typeof Chart !== 'undefined') {
  Chart.defaults.color = 'hsl(215, 20%, 75%)'; // Light slate text
  Chart.defaults.borderColor = 'hsl(217, 33%, 17%)'; // Grid line border color
  Chart.defaults.plugins.legend.labels.color = 'hsl(210, 40%, 98%)'; // Legend labels
  Chart.defaults.plugins.title.color = 'hsl(210, 40%, 98%)'; // Title
}


// 1. Guard check: Make sure user is authenticated
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token || !user) {
  localStorage.clear();
  window.location.href = 'login.html';
}

// 2. Adjust navigation based on role
const backBtn = document.getElementById('back-dashboard-btn');
if (backBtn && user.role === 'admin') {
  backBtn.href = 'admin.html';
}

const welcomeMsg = document.getElementById('welcome-message');
if (welcomeMsg) {
  welcomeMsg.innerText = `Welcome, ${user.name}${user.role === 'admin' ? ' (Admin)' : ''}`;
}

// Handle Logout
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

// --- FETCH DATA & CHART RENDERING ---

async function loadAnalytics() {
  try {
    const response = await fetch(`${API_BASE_URL}/issues/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Could not compile statistics aggregates.');
    }

    const data = await response.json();

    // 1. Render Metrics Cards
    document.getElementById('stats-total').innerText = data.stats.total;
    document.getElementById('stats-pending').innerText = data.stats.pending;
    document.getElementById('stats-progress').innerText = data.stats.in_progress;
    document.getElementById('stats-resolved').innerText = data.stats.resolved;

    // 2. Render Trends Line Chart
    renderTrendChart(data.trends);

    // 3. Render Categories Doughnut Chart
    renderCategoryChart(data.byCategory);

    // 4. Render Priority Bar Chart
    renderPriorityChart(data.byPriority);

  } catch (err) {
    console.error(err);
    showNotification(err.message, 'danger');
  }
}

function renderTrendChart(trendsData) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  
  // Pre-populate last 6 months with 0 count
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`; // matches strftime('%Y-%m')
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    
    last6Months.push({
      key: key,
      label: label,
      count: 0
    });
  }

  // Merge backend counts into the corresponding month slots
  trendsData.forEach(t => {
    const match = last6Months.find(m => m.key === t.month);
    if (match) {
      match.count = t.count;
    }
  });

  const labels = last6Months.map(m => m.label);
  const values = last6Months.map(m => m.count);

  // Premium area fill gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.45)');
  gradient.addColorStop(1, 'rgba(59, 130, 246, 0.00)');

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Issues Reported',
        data: values,
        borderColor: '#3B82F6',
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(9, 15, 29, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'hsl(217, 33%, 20%)',
          borderWidth: 1
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { 
            stepSize: 1, 
            precision: 0,
            color: 'hsl(215, 20%, 75%)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        },
        x: {
          ticks: {
            color: 'hsl(215, 20%, 75%)'
          },
          grid: {
            display: false
          }
        }
      }
    }
  });
}

function renderCategoryChart(categoryData) {
  const ctx = document.getElementById('categoryChart').getContext('2d');
  
  const labels = categoryData.map(c => c.category);
  const values = categoryData.map(c => c.count);

  const colors = [
    '#3B82F6', // Blue
    '#EAB308', // Yellow
    '#EF4444', // Red
    '#10B981', // Green
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#F97316'  // Orange
  ];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 2,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 15, font: { size: 12 } }
        }
      }
    }
  });
}

function renderPriorityChart(priorityData) {
  const ctx = document.getElementById('priorityChart').getContext('2d');
  
  // Align standard priorities
  const allPriorities = ['Low', 'Medium', 'High', 'Critical'];
  const dataMap = { 'Low': 0, 'Medium': 0, 'High': 0, 'Critical': 0 };
  
  priorityData.forEach(p => {
    if (p.priority in dataMap) {
      dataMap[p.priority] = p.count;
    }
  });

  const values = allPriorities.map(p => dataMap[p]);
  
  const colors = [
    '#9CA3AF', // Low: Gray
    '#3B82F6', // Medium: Blue
    '#F97316', // High: Orange
    '#EF4444'  // Critical: Red
  ];

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: allPriorities,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 6,
        barThickness: 45
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 }
        }
      }
    }
  });
}

// Start loading statistics
loadAnalytics();
