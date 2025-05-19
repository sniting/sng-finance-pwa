export const sections = document.querySelectorAll('.app-section');
export const navItems = document.querySelectorAll('.nav-item');
export const defaultSection = 'dashboard';

const toastElement = document.getElementById('toast-notification');
let toastTimeout;

export function showToast(message, duration = 3000) {
  toastElement.textContent = message;
  toastElement.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastElement.classList.remove('show');
  }, duration);
}

export function navigateTo(sectionId) {
  sections.forEach(section => section.classList.remove('active'));
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add('active');
  } else {
    document.getElementById(defaultSection).classList.add('active');
    sectionId = defaultSection;
  }
  navItems.forEach(item => {
    const isActive = item.getAttribute('data-target') === sectionId;
    item.classList.toggle('text-indigo-600', isActive);
    item.classList.toggle('bg-indigo-50', isActive);
    item.classList.toggle('text-slate-500', !isActive);
    item.classList.toggle('bg-white', !isActive);
  });
  window.scrollTo(0, 0);
}
