// --- AUTHENTICATION SCRIPTS FOR CIVICCONNECT ---

const API_BASE_URL = 'http://localhost:5000/api';

// Helper to show alert notifications
function showAlert(message, type = 'danger') {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.className = `alert alert-${type}`;
    alertBox.innerText = message;
    alertBox.style.display = 'block';
    
    // Auto-scroll to top to ensure user sees the alert
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Redirect already logged-in users away from auth pages
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));
  
  if (token && user) {
    // If they are logged in, redirect them immediately to their dashboard
    if (user.role === 'admin') {
      window.location.href = 'admin.html';
    } else {
      window.location.href = 'dashboard.html';
    }
  }
});

// --- REGISTER FORM SUBMISSION ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Stop standard form refresh
    
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, role })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed.');
      }
      
      // If success, notify user and redirect to login page after 2 seconds
      showAlert('Account created successfully! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
      
    } catch (error) {
      showAlert(error.message);
    }
  });
}

// --- LOGIN FORM SUBMISSION ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed.');
      }
      
      // Save JWT token and user info into local storage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect users to their respective dashboards based on their role
      if (data.user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
      
    } catch (error) {
      showAlert(error.message);
    }
  });
}
