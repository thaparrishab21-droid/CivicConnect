// --- AUTHENTICATION SCRIPTS FOR CIVICCONNECT ---

const API_BASE_URL = 'http://localhost:5000/api';

// Helper to show alert notifications
function showAlert(message, type = 'danger') {
  const alertBox = document.getElementById('alert-box');
  if (alertBox) {
    alertBox.className = `p-4 rounded-xl border mb-6 text-sm font-semibold transition-all duration-300`;
    if (type === 'success') {
      alertBox.classList.add('bg-green-50', 'text-green-800', 'border-green-200');
    } else {
      alertBox.classList.add('bg-red-50', 'text-red-800', 'border-red-200');
    }
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
  const urlParams = new URLSearchParams(window.location.search);
  const portal = urlParams.get('portal');
  
  // Dynamic header customization if in Admin Portal mode
  if (portal === 'admin') {
    const authHeaderTitle = document.querySelector('.auth-header h2');
    const authHeaderDesc = document.querySelector('.auth-header p');
    if (authHeaderTitle) authHeaderTitle.innerText = 'Admin Portal';
    if (authHeaderDesc) authHeaderDesc.innerText = 'Access the CivicConnect administration panel';
    
    // Create and display a badge indicating Admin Mode
    const authHeader = document.querySelector('.auth-header');
    if (authHeader && !document.getElementById('portal-badge')) {
      const badge = document.createElement('span');
      badge.id = 'portal-badge';
      badge.style.display = 'inline-block';
      badge.style.backgroundColor = 'rgba(20, 184, 166, 0.15)'; 
      badge.style.color = 'var(--accent-teal)';
      badge.style.padding = '0.35rem 0.85rem';
      badge.style.borderRadius = '50px';
      badge.style.fontSize = '0.8rem';
      badge.style.fontWeight = '600';
      badge.style.marginBottom = '1rem';
      badge.style.border = '1px solid rgba(20, 184, 166, 0.3)';
      badge.style.textTransform = 'uppercase';
      badge.style.letterSpacing = '0.05em';
      badge.innerText = 'Admin Access Only';
      
      authHeader.insertBefore(badge, authHeader.firstChild);
    }
  }

  if (token && user) {
    if (portal === 'admin' && user.role !== 'admin') {
      // Clear citizen session to allow logging in as admin
      localStorage.clear();
    } else {
      // If they are logged in, redirect them immediately to their dashboard
      if (user.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'dashboard.html';
      }
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
    
    // Check if we are in admin portal mode
    const urlParams = new URLSearchParams(window.location.search);
    const portal = urlParams.get('portal');
    
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
      
      // If we are in the admin portal, verify user is actually an admin
      if (portal === 'admin' && data.user.role !== 'admin') {
        throw new Error('Unauthorized: Only administrators can access the Admin Portal.');
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

// --- PASSWORD VISIBILITY TOGGLE ---
document.addEventListener('DOMContentLoaded', () => {
  const toggleButtons = document.querySelectorAll('.password-toggle-btn');
  toggleButtons.forEach(button => {
    button.addEventListener('click', () => {
      const wrapper = button.closest('.password-wrapper');
      if (!wrapper) return;
      const input = wrapper.querySelector('input');
      const eyeIcon = button.querySelector('.eye-icon');
      const eyeSlashIcon = button.querySelector('.eye-slash-icon');
      
      if (input && eyeIcon && eyeSlashIcon) {
        if (input.type === 'password') {
          input.type = 'text';
          eyeIcon.style.display = 'none';
          eyeSlashIcon.style.display = 'block';
        } else {
          input.type = 'password';
          eyeIcon.style.display = 'block';
          eyeSlashIcon.style.display = 'none';
        }
      }
    });
  });
});
