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
});

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

// LOCAL STORAGE HELPERS
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
    def = def || {};
    try { 
      return JSON.parse(localStorage.getItem('fitly_' + key)) || def; 
    }
    catch(e) { 
      return def; 
    }
  }
};

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