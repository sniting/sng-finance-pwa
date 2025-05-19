import { auth, db } from './firebase.js';
import { showToast } from './ui.js';

export let currentUserId = null;

const authSection = document.getElementById('auth-section');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutButton = document.getElementById('logout-button');
const bottomNav = document.getElementById('bottom-nav');

function showAuth() {
  authSection.classList.remove('hidden');
  document.querySelector('main').classList.add('hidden');
  logoutButton.classList.add('hidden');
  bottomNav.classList.add('hidden');
}

function showApp() {
  authSection.classList.add('hidden');
  document.querySelector('main').classList.remove('hidden');
  logoutButton.classList.remove('hidden');
  bottomNav.classList.remove('hidden');
}

export function setupAuth() {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUserId = user.uid;
      showApp();
      document.dispatchEvent(new CustomEvent('auth-changed', { detail: true }));
    } else {
      currentUserId = null;
      showAuth();
      document.dispatchEvent(new CustomEvent('auth-changed', { detail: false }));
    }
  });

  showRegisterLink.addEventListener('click', e => {
    e.preventDefault();
    showAuthForms(false);
  });
  showLoginLink.addEventListener('click', e => {
    e.preventDefault();
    showAuthForms(true);
  });
  logoutButton.addEventListener('click', logoutUser);

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email');
      return;
    }
    if (email && pass) {
      try {
        await loginUser(email, pass);
      } catch (err) {
        showToast(err.message);
      }
    }
  });

  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    const nick = document.getElementById('register-nickname').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const pass = document.getElementById('register-password').value;
    if (!isValidEmail(email)) {
      showToast('Please enter a valid email');
      return;
    }
    if (nick && email && pass) {
      try {
        await createAccount(nick, email, pass);
      } catch (err) {
        showToast(err.message);
      }
    }
  });
}

function showAuthForms(isLogin) {
  if (isLogin) {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
  }
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export async function loginUser(email, password) {
  const cred = await auth.signInWithEmailAndPassword(email, password);
  currentUserId = cred.user.uid;
}

export async function createAccount(nick, email, password) {
  const cred = await auth.createUserWithEmailAndPassword(email, password);
  await db.collection('users').doc(cred.user.uid).set({ nickname: nick, email });
  currentUserId = cred.user.uid;
  showApp();
  showToast('Welcome!');
}

export function logoutUser() {
  currentUserId = null;
  auth.signOut();
}
