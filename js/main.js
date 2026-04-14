// Fitly - Main JavaScript

// ===================== NAVBAR ACTIVE STATE =====================
document.addEventListener('DOMContentLoaded', function () {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
});

// ===================== FORM VALIDATION =====================
function validateForm(formId) {
  const form = document.getElementById(formId);
  if (!form) return true;
  let isValid = true;
  const required = form.querySelectorAll('[required]');
  required.forEach(field => {
    const err = field.parentElement.querySelector('.field-error');
    if (!field.value.trim()) {
      field.style.borderColor = 'var(--danger)';
      if (err) err.style.display = 'block';
      isValid = false;
    } else {
      field.style.borderColor = 'var(--border)';
      if (err) err.style.display = 'none';
    }
  });
  return isValid;
}

// ===================== TOAST NOTIFICATION =====================
function showToast(message, type = 'success') {
  const existing = document.getElementById('fitly-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'fitly-toast';
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    background: var(--bg-card-2); border: 1px solid ${type === 'success' ? 'rgba(0,229,160,0.4)' : 'rgba(255,77,106,0.4)'};
    color: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
    padding: 12px 20px; border-radius: 12px; font-size: 0.875rem;
    font-family: 'Inter', sans-serif; font-weight: 500;
    animation: slideIn 0.3s ease;
    max-width: 320px;
  `;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  `;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3500);
}

// ===================== LOCAL STORAGE HELPERS =====================
const Store = {
  get: (key) => {
    try { return JSON.parse(localStorage.getItem('fitly_' + key)) || []; }
    catch { return []; }
  },
  set: (key, val) => {
    try { localStorage.setItem('fitly_' + key, JSON.stringify(val)); }
    catch (e) { console.warn('Storage error', e); }
  },
  getObj: (key, def = {}) => {
    try { return JSON.parse(localStorage.getItem('fitly_' + key)) || def; }
    catch { return def; }
  }
};

// ===================== DATE HELPERS =====================
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

// ===================== BMI CALCULATOR =====================
function calcBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const h = heightCm / 100;
  return (weightKg / (h * h)).toFixed(1);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return { label: 'Underweight', color: 'var(--warning)' };
  if (bmi < 25) return { label: 'Normal', color: 'var(--success)' };
  if (bmi < 30) return { label: 'Overweight', color: 'var(--warning)' };
  return { label: 'Obese', color: 'var(--danger)' };
}
