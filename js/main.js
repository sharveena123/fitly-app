var Store = {
  get: function (key) {
    try {
      return JSON.parse(localStorage.getItem('fitly_' + key)) || [];
    } catch (e) { return []; }
  },

  set: function (key, val) {
    try {
      localStorage.setItem('fitly_' + key, JSON.stringify(val));
    } catch (e) { console.warn('Storage error', e); }
  },

  getObj: function (key, def) {
    try {
      var result = JSON.parse(localStorage.getItem('fitly_' + key));
      return result !== null ? result : (def !== undefined ? def : {});
    } catch (e) { return def !== undefined ? def : {}; }
  },

  setObj: function (key, val) {
    try {
      localStorage.setItem('fitly_' + key, JSON.stringify(val));
    } catch (e) { console.warn('Storage error', e); }
  }

};

//Get current user ID 
function getCurrentUserId() {
  var profile = Store.getObj('profile', {});
  return profile.id || null;
}

// Get Authentication token
function getToken() {
  return localStorage.getItem('token') || null;
}

// Navbar active state 
document.addEventListener('DOMContentLoaded', function () {
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var navLinks    = document.querySelectorAll('.nav-link');

  for (var i = 0; i < navLinks.length; i++) {
    var link = navLinks[i];
    var href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  }

  updateNavbarAuthState();
});

// Navbar auth state
function updateNavbarAuthState() {
  var token       = localStorage.getItem('token');
  var currentUser = Store.getObj('currentUser', null);
  var navbarAuth  = document.querySelector('.navbar-nav .ms-2');
  var navProtected = document.querySelectorAll('.nav-protected');

  if (!navbarAuth) return;

  if (token || (currentUser && currentUser.email)) {
    navbarAuth.innerHTML =
      '<a id="logout-btn" class="btn-primary-custom" href="#" onclick="handleLogout(); return false;" style="padding: 8px 18px; font-size: 0.8rem;">' +
      '<i class="bi bi-box-arrow-right me-1"></i>Logout</a>';
    for (var i = 0; i < navProtected.length; i++) navProtected[i].style.display = 'block';
  } else {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'index.html' || currentPage === '') {
      for (var i = 0; i < navProtected.length; i++) navProtected[i].style.display = 'none';
      navbarAuth.innerHTML =
        '<a class="btn-primary-custom" href="pages/register.html" style="padding: 8px 18px; font-size: 0.8rem; margin-right: 8px; display: inline-block;">Sign Up</a>' +
        '<a class="btn-primary-custom" href="pages/login.html" style="padding: 8px 18px; font-size: 0.8rem; display: inline-block;">Sign In</a>';
    } else {
      for (var i = 0; i < navProtected.length; i++) navProtected[i].style.display = 'block';
      navbarAuth.innerHTML =
        '<a class="btn-primary-custom" href="login.html" style="padding: 8px 18px; font-size: 0.8rem;">Sign In</a>';
    }
  }
}

// Demo login for Fitly
function loginDemoUser() {
  localStorage.setItem('token', 'mock-demo-token-xyz-12345');

  var demoUser = { email: 'demo@fitly.com', name: 'Demo User', age: 28, weight: 75, height: 175, goal: 'Build muscle', isDemo: true };
  Store.setObj('currentUser', demoUser);
  Store.setObj('profile', demoUser);

  showToast("Welcome to Fitly! You're logged in as a demo user.", 'success');

  setTimeout(function () {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'login.html' || currentPage === 'register.html') {
      window.location.href = 'dashboard.html';
    } else if (window.location.pathname.includes('/pages/')) {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'pages/dashboard.html';
    }
  }, 800);
}

// Logout 
function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;

  localStorage.removeItem('token');
  localStorage.removeItem('fitly_currentUser');
  localStorage.removeItem('fitly_remember_token');
  localStorage.removeItem('fitly_profile');

  showToast('You have been logged out successfully.', 'success');

  setTimeout(function () {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    window.location.href = (currentPage === 'index.html' || currentPage === '') ? 'index.html' : '../index.html';
  }, 800);
}

// Validating the form
function validateForm(formId) {
  var form = document.getElementById(formId);
  if (!form) return true;

  var isValid = true;
  var requiredFields = form.querySelectorAll('[required]');

  for (var i = 0; i < requiredFields.length; i++) {
    var field = requiredFields[i];
    var err   = field.parentElement.querySelector('.field-error');
    if (!field.value.trim()) {
      field.style.borderColor = '#dc3545';
      if (err) err.classList.remove('hidden');
      isValid = false;
    } else {
      field.style.borderColor = '#dddddd';
      if (err) err.classList.add('hidden');
    }
  }
  return isValid;
}

// Notifications
function showToast(message, type) {
  type = type || 'success';
  var existing = document.getElementById('fitly-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'fitly-toast';
  toast.className = 'alert ' + ((type === 'success') ? 'alert-success' : 'alert-info');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;min-width:250px;box-shadow:0 2px 8px rgba(0,0,0,0.15);';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () { if (toast.parentNode) toast.remove(); }, 3500);
}

// Date helpers 
function formatDate(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// BMI Calculation
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  var h = heightCm / 100;
  return (weightKg / (h * h)).toFixed(1);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#ff9900' };
  if (bmi < 25)   return { label: 'Normal',      color: '#00aa55' };
  if (bmi < 30)   return { label: 'Overweight',  color: '#ff9900' };
  return                  { label: 'Obese',       color: '#dc3545' };
}