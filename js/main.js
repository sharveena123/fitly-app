var Store = {
  get: function(key) {
    try { 
      return JSON.parse(localStorage.getItem('fitly_' + key)) || []; 
    }
    catch(e) { 
      return []; 
    }
  },
  set: function(key, val) {
    try { 
      localStorage.setItem('fitly_' + key, JSON.stringify(val)); 
    }
    catch (e) { 
      console.warn('Storage error', e); 
    }
  },
  getObj: function(key, def) {
    try { 
      var result = JSON.parse(localStorage.getItem('fitly_' + key));
      return result !== null ? result : (def !== undefined ? def : {});
    }
    catch(e) { 
      return def !== undefined ? def : {};
    }
  }
};

// NAVBAR ACTIVE STATE
document.addEventListener('DOMContentLoaded', function () {
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var navLinks = document.querySelectorAll('.nav-link');
  
  for (var i = 0; i < navLinks.length; i++) {
    var link = navLinks[i];
    var href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  }

  // Update navbar based on login state
  updateNavbarAuthState();
});

// UPDATE NAVBAR AUTH STATE
function updateNavbarAuthState() {
  var currentUser = Store.getObj('currentUser', null);
  var navbarAuth = document.querySelector('.navbar-nav .ms-2');
  var navProtected = document.querySelectorAll('.nav-protected');
  
  if (!navbarAuth) return; // Safety check
  
  if (currentUser && currentUser.email) {
    // User is logged in - show logout button and show protected nav items
    navbarAuth.innerHTML = '<a id="logout-btn" class="btn-primary-custom" href="#" onclick="handleLogout(); return false;" style="padding: 8px 18px; font-size: 0.8rem;"><i class="bi bi-box-arrow-right me-1"></i>Logout</a>';
    // Show protected nav items
    for (var i = 0; i < navProtected.length; i++) {
      navProtected[i].style.display = 'block';
    }
  } else {
    // User is not logged in
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'index.html' || currentPage === '') {
      // On landing page - hide protected nav items and show Sign Up + Sign In
      for (var i = 0; i < navProtected.length; i++) {
        navProtected[i].style.display = 'none';
      }
      navbarAuth.innerHTML = '<a class="btn-primary-custom" href="pages/register.html" style="padding: 8px 18px; font-size: 0.8rem; margin-right: 8px; display: inline-block;">Sign Up</a>' +
        '<a class="btn-primary-custom" href="pages/login.html" style="padding: 8px 18px; font-size: 0.8rem; display: inline-block;">Sign In</a>';
    } else {
      // On other pages - show protected nav items and show Sign In button
      for (var i = 0; i < navProtected.length; i++) {
        navProtected[i].style.display = 'block';
      }
      navbarAuth.innerHTML = '<a class="btn-primary-custom" href="login.html" style="padding: 8px 18px; font-size: 0.8rem;">Sign In</a>';
    }
  }
}

// DEMO USER LOGIN
function loginDemoUser() {
  var demoUser = {
    email: 'demo@fitly.com',
    name: 'Demo User',
    age: 28,
    weight: 75,
    height: 175,
    goal: 'Build muscle',
    isDemo: true
  };
  
  Store.setObj('currentUser', demoUser);
  showToast('Welcome to Fitly! You\'re logged in as a demo user.', 'success');
  
  setTimeout(function() {
    var currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage === 'login.html' || currentPage === 'register.html') {
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = '../pages/dashboard.html';
    }
  }, 800);
}

// DEMO USER LOGIN (alternate version for Store.setObj compatibility)
function Store_setObj(key, val) {
  try { 
    localStorage.setItem('fitly_' + key, JSON.stringify(val)); 
  }
  catch (e) { 
    console.warn('Storage error', e); 
  }
}

Store.setObj = function(key, val) {
  try { 
    localStorage.setItem('fitly_' + key, JSON.stringify(val)); 
  }
  catch (e) { 
    console.warn('Storage error', e); 
  }
};

// LOGOUT HANDLER
function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }
  localStorage.removeItem('fitly_currentUser');
  localStorage.removeItem('fitly_remember_token');
  showToast('You have been logged out successfully.', 'success');
  setTimeout(function() {
    window.location.href = '../index.html';
  }, 800);
}

// FORM VALIDATION
function validateForm(formId) {
  var form = document.getElementById(formId);
  if (!form) return true;
  
  var isValid = true;
  var requiredFields = form.querySelectorAll('[required]');
  
  for (var i = 0; i < requiredFields.length; i++) {
    var field = requiredFields[i];
    var err = field.parentElement.querySelector('.field-error');
    
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

// TOAST NOTIFICATION
function showToast(message, type) {
  type = type || 'success';
  
  var existing = document.getElementById('fitly-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'fitly-toast';
  
  var alertClass = (type === 'success') ? 'alert-success' : 'alert-info';
  toast.className = 'alert ' + alertClass;
  
  toast.style.position = 'fixed';
  toast.style.bottom = '24px';
  toast.style.right = '24px';
  toast.style.zIndex = '9999';
  toast.style.minWidth = '250px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  
  toast.textContent = message;

  document.body.appendChild(toast);
  
  setTimeout(function() { 
    if (toast.parentNode) toast.remove(); 
  }, 3500);
}

// DATE HELPERS
function formatDate(dateStr) {
  if (!dateStr) return '—';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// BMI CALCULATOR
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  var h = heightCm / 100;
  return (weightKg / (h * h)).toFixed(1);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: '#ff9900' };
  if (bmi < 25) return { label: 'Normal', color: '#00aa55' }; 
  if (bmi < 30) return { label: 'Overweight', color: '#ff9900' }; 
  return { label: 'Obese', color: '#dc3545' };
}