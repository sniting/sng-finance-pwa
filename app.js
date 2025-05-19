// Add this near the beginning of your script section in index.html

// Function to check PWA cache status
async function checkPwaReadiness() {
  try {
    // First check if service worker is active
    if (!("serviceWorker" in navigator)) {
      console.log("Service Workers not supported");
      return false;
    }

    if (!navigator.serviceWorker.controller) {
      console.log("No active service worker found");
      return false;
    }

    // Then check if critical resources are cached
    const cache = await caches.open("sng-finance-cache-v2");
    if (!cache) {
      console.log("Cache storage not found");
      return false;
    }

    // Check for critical cached resources
    const indexHtml = await cache.match("/index.html");

    if (!indexHtml) {
      console.log("Critical resource /index.html not found in cache");
      return false;
    }

    console.log("PWA is ready - critical resources are cached");
    return true;
  } catch (error) {
    console.error("Error checking PWA readiness:", error);
    return false;
  }
}

// This will run when a PWA is launched and ensure everything is ready
if (window.matchMedia("(display-mode: standalone)").matches) {
  // App is running as installed PWA
  checkPwaReadiness().then((isReady) => {
    if (!isReady && navigator.onLine) {
      console.log("PWA cache not ready, but we are online - will build cache");
      // No need to show error message - service worker will cache resources
    }
  });
}
// --- Global Variables & Constants ---
const sections = document.querySelectorAll(".app-section");
const navItems = document.querySelectorAll(".nav-item");
const defaultSection = "dashboard";
let transactionsData = [];
let editingTransactionId = null;
let appBudgets = {}; // This seems to be local, check if it needs to be in Firestore
let remindersData = [];
let editingReminderId = null;
let unsubscribeTransactions = null;
let unsubscribeReminders = null;

// --- Firebase Config is provided via firebaseConfig.js ---

// --- Initialize Firebase ---
let app;
let db;
let auth;
try {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
  } else {
    app = firebase.app();
  }
  db = firebase.firestore();
  auth = firebase.auth();
  console.log("Firebase initialized (App, Firestore, Auth)");
} catch (error) {
  console.error("Error initializing Firebase:", error);
  showToast("Error connecting to backend.", 5000);
}

// --- Simple Authentication ---
const authSection = document.getElementById("auth-section");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterLink = document.getElementById("show-register");
const showLoginLink = document.getElementById("show-login");
const logoutButton = document.getElementById("logout-button");
const bottomNav = document.getElementById("bottom-nav");

function showAuth() {
  authSection.classList.remove("hidden");
  document.querySelector("main").classList.add("hidden");
  logoutButton.classList.add("hidden");
  bottomNav.classList.add("hidden");
}
function showApp() {
  authSection.classList.add("hidden");
  document.querySelector("main").classList.remove("hidden");
  logoutButton.classList.remove("hidden");
  bottomNav.classList.remove("hidden");
}

// --- Local Storage Fallback for User Data ---
function getLocalCollection(name) {
  const data = localStorage.getItem(`local_${name}`);
  return data ? JSON.parse(data) : [];
}

function saveLocalCollection(name, items) {
  localStorage.setItem(`local_${name}`, JSON.stringify(items));
}

function addToLocalCollection(name, item) {
  const items = getLocalCollection(name);
  item.id = Date.now().toString();
  items.push(item);
  saveLocalCollection(name, items);
  return item.id;
}

function updateLocalCollection(name, item) {
  const items = getLocalCollection(name);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx !== -1) {
    items[idx] = item;
    saveLocalCollection(name, items);
  }
}

function deleteFromLocalCollection(name, id) {
  const items = getLocalCollection(name).filter((i) => i.id !== id);
  saveLocalCollection(name, items);
}

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

async function loginUser(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    currentUserId = auth.currentUser.uid;
  } catch (e) {
    console.error(e);
    showToast(e.message);
  }
}

async function createAccount(nick, email, password) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db
      .collection("users")
      .doc(cred.user.uid)
      .set({ nickname: nick, email });
    currentUserId = cred.user.uid;
    showApp();
    setupFirestoreListeners();
    showToast("Welcome!");
    registerForm.reset();
  } catch (e) {
    console.error(e);
    showToast(e.message);
  }
}

function logoutUser() {
  if (unsubscribeTransactions) unsubscribeTransactions();
  if (unsubscribeReminders) unsubscribeReminders();
  currentUserId = null;
  auth.signOut();
}

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserId = user.uid;
    showApp();
    setupFirestoreListeners();
  } else {
    showAuth();
  }
});

function showAuthForms(isLogin) {
  if (isLogin) {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  }
}

showRegisterLink.addEventListener("click", (e) => {
  e.preventDefault();
  showAuthForms(false);
});
showLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  showAuthForms(true);
});
logoutButton.addEventListener("click", logoutUser);
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  if (!isValidEmail(email)) {
    showToast("Please enter a valid email");
    return;
  }
  if (email && pass) loginUser(email, pass);
});
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const nick = document.getElementById("register-nickname").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const pass = document.getElementById("register-password").value;
  if (!isValidEmail(email)) {
    showToast("Please enter a valid email");
    return;
  }
  if (nick && email && pass) createAccount(nick, email, pass);
});
// --- PWA Service Worker Registration ---
// Updated service worker registration that won't show the offline message incorrectly
// Replace your current service worker registration code with this improved version
// that won't show any error messages

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("ServiceWorker registration successful. Scope:", reg.scope);

        // Check for updates to the service worker
        reg.update().catch((err) => {
          console.warn("Service worker update check failed:", err);
          // Don't show toast to user - this is a background process
        });

        // Handle controller change (when a new service worker takes over)
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("New service worker controller activated");
        });
      })
      .catch((err) => {
        // Just log errors to console - don't show to user
        console.error("ServiceWorker registration failed:", err);

        // Importantly - DON'T show any toast messages here
        // The previous code was showing this error message:
        // showToast('PWA functionality may be limited. Reload if needed.', 5000);

        // Instead, just silently log the error
      });
  });

  // Listen for service worker messages
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type) {
      console.log("Message from service worker:", event.data);

      // Only show user-facing messages for important updates
      if (event.data.type === "CACHE_UPDATED") {
        console.log("App updated! Reload for latest version.");
        // Optionally show a toast, but it's better to be silent:
        // showToast('App updated! Reload for latest version.', 5000);
      }
    }
  });
}
// --- Toast Notification ---
const toastElement = document.getElementById("toast-notification");
let toastTimeout;
function showToast(message, duration = 3000) {
  toastElement.textContent = message;
  toastElement.classList.add("show");
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastElement.classList.remove("show");
  }, duration);
}

// --- Navigation Logic ---
function navigateTo(sectionId) {
  sections.forEach((section) => section.classList.remove("active"));
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
  } else {
    document.getElementById(defaultSection).classList.add("active");
    sectionId = defaultSection;
  }
  navItems.forEach((item) => {
    const isActive = item.getAttribute("data-target") === sectionId;
    item.classList.toggle("text-indigo-600", isActive);
    item.classList.toggle("bg-indigo-50", isActive);
    item.classList.toggle("text-slate-500", !isActive);
    item.classList.toggle("bg-white", !isActive);
  });
  window.scrollTo(0, 0);
}

// --- Transaction Form ---
const transactionForm = document.getElementById("addTransactionForm");
const transactionFormTitle = document.getElementById("transactionFormTitle");
const saveTransactionButton = document.getElementById("saveTransactionBtn");
const cancelTransactionButton = document.getElementById("cancelEditBtn");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const descriptionInput = document.getElementById("description");
const accountSelect = document.getElementById("account");
const transactionIdInput = document.getElementById("transactionId");

function prepareTransactionForm(type = "expense") {
  resetTransactionForm();
  if (type === "income") {
    amountInput.placeholder = "Enter positive amount (e.g., 300)";
    categorySelect.value = "income";
  } else {
    amountInput.placeholder = "Enter negative amount (e.g., -15.50)";
    if (categorySelect.value === "income") categorySelect.value = "food"; // Default to food if it was income
    categorySelect.disabled = false;
  }
  dateInput.valueAsDate = new Date();
  navigateTo("transactions");
  descriptionInput.focus();
}
function resetTransactionForm() {
  transactionForm.reset();
  editingTransactionId = null;
  transactionIdInput.value = "";
  transactionFormTitle.textContent = "Add New Transaction";
  saveTransactionButton.textContent = "Save Transaction";
  saveTransactionButton.classList.remove(
    "bg-yellow-500",
    "hover:bg-yellow-600",
  );
  saveTransactionButton.classList.add("bg-indigo-600", "hover:bg-indigo-700");
  cancelTransactionButton.classList.add("hidden");
  categorySelect.disabled = false;
  accountSelect.value = "debit"; // Default account
  dateInput.valueAsDate = new Date();
}

// --- Reminder Form ---
const reminderFormContainer = document.getElementById(
  "addReminderFormContainer",
);
const reminderForm = document.getElementById("addReminderForm");
const reminderFormTitle = document.getElementById("reminderFormTitle");
const saveReminderButton = document.getElementById("saveReminderBtn");
// const cancelReminderButton = document.getElementById('cancelReminderEditBtn'); // Already handled by inline onclick
const reminderDescriptionInput = document.getElementById("reminderDescription");
const reminderDueDateInput = document.getElementById("reminderDueDate");
const reminderIdInput = document.getElementById("reminderId");

function toggleReminderForm(show = true) {
  if (show) {
    reminderFormContainer.classList.add("active");
    resetReminderForm();
    reminderDescriptionInput.focus();
  } else {
    reminderFormContainer.classList.remove("active");
  }
}
function resetReminderForm() {
  reminderForm.reset();
  editingReminderId = null;
  reminderIdInput.value = "";
  reminderFormTitle.textContent = "Add Reminder";
  saveReminderButton.textContent = "Save Reminder";
  saveReminderButton.classList.remove("bg-yellow-500", "hover:bg-yellow-600");
  saveReminderButton.classList.add("bg-indigo-600", "hover:bg-indigo-700");
}

// --- Firebase Data Functions ---
let currentUserId = null;

function getUserCollectionRef(collectionName) {
  if (!db) {
    console.error("Firestore (db) is not initialized!");
    showToast("Data backend not ready.", 3000);
    return null;
  }
  // All data will be stored under the generic user ID path
  console.log(
    `Accessing Firestore path: users/${currentUserId}/${collectionName}`,
  ); // Log path
  return db.collection("users").doc(currentUserId).collection(collectionName);
}

async function addTransactionToFirestore(transaction) {
  const transactionsRef = getUserCollectionRef("transactions");
  if (!transactionsRef) {
    const id = addToLocalCollection("transactions", transaction);
    transactionsData.push({ ...transaction, id });
    renderAll();
    showToast("Transaction saved locally.");
    resetTransactionForm();
    return;
  }
  try {
    const dataToAdd = {
      ...transaction,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    delete dataToAdd.id;
    delete dataToAdd.transactionId;
    await transactionsRef.add(dataToAdd);
    showToast("Transaction added!");
    resetTransactionForm();
  } catch (error) {
    console.error("Error adding transaction: ", error);
    const id = addToLocalCollection("transactions", transaction);
    transactionsData.push({ ...transaction, id });
    renderAll();
    showToast("Transaction saved locally.");
  }
}

async function updateTransactionInFirestore(transaction) {
  const transactionsRef = getUserCollectionRef("transactions");
  if (!transactionsRef || !transaction.id) {
    updateLocalCollection("transactions", transaction);
    const idx = transactionsData.findIndex((t) => t.id === transaction.id);
    if (idx !== -1) transactionsData[idx] = { ...transaction };
    renderAll();
    showToast("Transaction updated locally.");
    resetTransactionForm();
    return;
  }
  try {
    const docRef = transactionsRef.doc(transaction.id.toString());
    const dataToUpdate = { ...transaction };
    delete dataToUpdate.id;
    delete dataToUpdate.transactionId;
    await docRef.update(dataToUpdate);
    showToast("Transaction updated!");
    resetTransactionForm();
  } catch (error) {
    console.error("Error updating transaction: ", error);
    updateLocalCollection("transactions", transaction);
    const idx = transactionsData.findIndex((t) => t.id === transaction.id);
    if (idx !== -1) transactionsData[idx] = { ...transaction };
    renderAll();
    showToast("Transaction updated locally.");
  }
}

async function deleteTransactionFromFirestore(id) {
  const transactionsRef = getUserCollectionRef("transactions");
  if (!id) {
    console.error("Delete failed: Invalid ID provided.");
    showToast("Error: Invalid transaction ID.", 5000);
    return;
  }
  if (!transactionsRef) {
    deleteFromLocalCollection("transactions", id);
    transactionsData = transactionsData.filter((t) => t.id !== id);
    renderAll();
    showToast("Transaction removed locally.");
    return;
  }
  if (confirm("Are you sure you want to delete this transaction?")) {
    try {
      await transactionsRef.doc(id.toString()).delete();
      showToast("Transaction deleted.");
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      deleteFromLocalCollection("transactions", id);
      transactionsData = transactionsData.filter((t) => t.id !== id);
      renderAll();
      showToast("Transaction removed locally.");
    }
  }
}

async function addReminderToFirestore(reminder) {
  const remindersRef = getUserCollectionRef("reminders");
  if (!remindersRef) {
    const id = addToLocalCollection("reminders", reminder);
    remindersData.push({ ...reminder, id });
    renderReminders();
    showToast("Reminder saved locally.");
    resetReminderForm();
    toggleReminderForm(false);
    return;
  }
  try {
    const dataToAdd = {
      ...reminder,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    delete dataToAdd.id;
    delete dataToAdd.reminderId;
    await remindersRef.add(dataToAdd);
    showToast("Reminder added!");
    resetReminderForm();
    toggleReminderForm(false);
  } catch (error) {
    console.error("Error adding reminder: ", error);
    const id = addToLocalCollection("reminders", reminder);
    remindersData.push({ ...reminder, id });
    renderReminders();
    showToast("Reminder saved locally.");
  }
}
async function updateReminderInFirestore(reminder) {
  const remindersRef = getUserCollectionRef("reminders");
  if (!remindersRef || !reminder.id) {
    updateLocalCollection("reminders", reminder);
    const idx = remindersData.findIndex((r) => r.id === reminder.id);
    if (idx !== -1) remindersData[idx] = { ...reminder };
    renderReminders();
    showToast("Reminder updated locally.");
    resetReminderForm();
    toggleReminderForm(false);
    return;
  }
  try {
    const docRef = remindersRef.doc(reminder.id.toString());
    const dataToUpdate = { ...reminder };
    delete dataToUpdate.id;
    delete dataToUpdate.reminderId;
    await docRef.update(dataToUpdate);
    showToast("Reminder updated!");
    resetReminderForm();
    toggleReminderForm(false);
  } catch (error) {
    console.error("Error updating reminder: ", error);
    updateLocalCollection("reminders", reminder);
    const idx = remindersData.findIndex((r) => r.id === reminder.id);
    if (idx !== -1) remindersData[idx] = { ...reminder };
    renderReminders();
    showToast("Reminder updated locally.");
  }
}
async function deleteReminderFromFirestore(id) {
  const remindersRef = getUserCollectionRef("reminders");
  if (!id) {
    console.error("Delete failed: Invalid ID.");
    showToast("Error: Invalid reminder ID.", 5000);
    return;
  }
  if (!remindersRef) {
    deleteFromLocalCollection("reminders", id);
    remindersData = remindersData.filter((r) => r.id !== id);
    renderReminders();
    showToast("Reminder removed locally.");
    return;
  }
  if (confirm("Are you sure you want to delete this reminder?")) {
    try {
      await remindersRef.doc(id.toString()).delete();
      showToast("Reminder deleted.");
    } catch (error) {
      console.error("Error deleting reminder: ", error);
      deleteFromLocalCollection("reminders", id);
      remindersData = remindersData.filter((r) => r.id !== id);
      renderReminders();
      showToast("Reminder removed locally.");
    }
  }
}

// --- Rendering Logic ---
const transactionListElement = document.getElementById("transactionList");
const recentTransactionListElement = document.getElementById(
  "recentTransactionList",
);
const categoryBudgetListElement = document.getElementById("categoryBudgetList");
const personalCcBalanceEl = document.getElementById("balance-personal_cc");
const parentCcBalanceEl = document.getElementById("balance-parent_cc");
const reminderListElement = document.getElementById("reminderList");

function renderTransactions() {
  transactionListElement.innerHTML = "";
  if (transactionsData.length === 0) {
    transactionListElement.innerHTML =
      '<li class="text-slate-500 italic">No transactions recorded yet.</li>';
    return;
  }
  // Sort by date (desc) then by creation time (desc) for consistent ordering
  const sortedTransactions = [...transactionsData].sort((a, b) => {
    const dateA = new Date(a.date + (a.date.includes("T") ? "" : "T00:00:00"));
    const dateB = new Date(b.date + (b.date.includes("T") ? "" : "T00:00:00"));
    if (dateB - dateA !== 0) return dateB - dateA;
    // Fallback to createdAt if dates are the same and timestamps exist
    const timeA =
      a.createdAt && a.createdAt.seconds ? a.createdAt.toMillis() : 0;
    const timeB =
      b.createdAt && b.createdAt.seconds ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });

  sortedTransactions.forEach((t) => {
    const li = document.createElement("li");
    li.className =
      "flex justify-between items-center border-b border-slate-100 pb-4 pt-2 hover:bg-slate-50 px-2 -mx-2 rounded-md";
    const amountClass = t.amount >= 0 ? "amount-income" : "amount-expense";
    const amountFormatted = Math.abs(t.amount).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const sign = t.amount >= 0 ? "+" : "-";
    // Ensure date is handled robustly; add 'T00:00:00' for consistent local time parsing
    const dateObj = t.date
      ? new Date(t.date + (t.date.includes("T") ? "" : "T00:00:00"))
      : null;
    const dateFormatted = dateObj
      ? dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "No Date";

    li.innerHTML = `
                    <div class="flex-1 mr-3 overflow-hidden"> <p class="font-medium text-slate-800 truncate">${t.description || "No description"}</p>
                        <p class="text-sm text-slate-500">${dateFormatted} - ${t.account ? t.account.replace(/_/g, " ").replace("cc", "CC") : "N/A"}</p>
                        <p class="text-xs text-slate-400 capitalize">Category: ${t.category ? t.category.replace(/_/g, " ") : "N/A"}</p>
                    </div>
                    <div class="text-right flex-shrink-0">
                        <span class="${amountClass} font-semibold">${sign}${amountFormatted}</span>
                        <div class="mt-1 space-x-2">
                            <button onclick="editTransaction('${t.id}')" class="action-button edit-button">Edit</button>
                            <button onclick="deleteTransactionFromFirestore('${t.id}')" class="action-button delete-button">Delete</button>
                        </div>
                    </div>`;
    transactionListElement.appendChild(li);
  });
}
function renderRecentTransactions() {
  recentTransactionListElement.innerHTML = "";
  const sortedTransactions = [...transactionsData].sort((a, b) => {
    const dateA = new Date(a.date + (a.date.includes("T") ? "" : "T00:00:00"));
    const dateB = new Date(b.date + (b.date.includes("T") ? "" : "T00:00:00"));
    if (dateB - dateA !== 0) return dateB - dateA;
    const timeA =
      a.createdAt && a.createdAt.seconds ? a.createdAt.toMillis() : 0;
    const timeB =
      b.createdAt && b.createdAt.seconds ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  const recentTransactions = sortedTransactions.slice(0, 3);

  if (recentTransactions.length === 0) {
    recentTransactionListElement.innerHTML =
      '<li class="text-slate-500 italic">No transactions yet.</li>';
    return;
  }
  recentTransactions.forEach((t) => {
    const li = document.createElement("li");
    li.className =
      "flex justify-between items-center border-b border-slate-100 py-2";
    const amountClass = t.amount >= 0 ? "amount-income" : "amount-expense";
    const amountFormatted = Math.abs(t.amount).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
    const sign = t.amount >= 0 ? "+" : "-";
    li.innerHTML = `
                    <span class="text-slate-700 truncate mr-2">${t.description || "No description"}</span>
                    <span class="${amountClass} font-medium flex-shrink-0">${sign}${amountFormatted}</span>`;
    recentTransactionListElement.appendChild(li);
  });
}
function renderDashboardBalances() {
  const balances = { debit: 0, personal_cc: 0, parent_cc: 0 };
  transactionsData.forEach((t) => {
    if (balances.hasOwnProperty(t.account)) {
      // For credit cards, amount owed increases with negative transactions (spending)
      // and decreases with positive transactions (payments).
      // The balance calculation needs to reflect amount owed, not account balance.
      balances[t.account] += t.amount; // Sum transactions normally
    }
  });
  document.getElementById("balance-debit").textContent =
    balances.debit.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

  const balanceThreshold = 140; // Example threshold

  // Amount Owed = negative of the summed transactions for CCs
  const personalCcOwed = -balances.personal_cc;
  personalCcBalanceEl.textContent = personalCcOwed.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
  personalCcBalanceEl.classList.remove("balance-ok", "balance-high");
  if (personalCcOwed > balanceThreshold) {
    personalCcBalanceEl.classList.add("balance-high");
  } else {
    personalCcBalanceEl.classList.add("balance-ok");
  } // Includes 0 or credit balance

  const parentCCLimit = 500;
  const parentCCOwed = -balances.parent_cc;
  parentCcBalanceEl.childNodes[0].nodeValue =
    parentCCOwed.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    }) + " ";
  parentCcBalanceEl.classList.remove("balance-ok", "balance-high");
  if (parentCCOwed > balanceThreshold) {
    parentCcBalanceEl.classList.add("balance-high");
  } else {
    parentCcBalanceEl.classList.add("balance-ok");
  } // Includes 0 or credit balance

  const parentCCUsage =
    parentCCLimit > 0
      ? Math.max(0, Math.min(100, (parentCCOwed / parentCCLimit) * 100))
      : parentCCOwed > 0
        ? 100
        : 0;
  const limitBar = document.getElementById("limitBar-parent_cc");
  limitBar.style.width = `${parentCCUsage}%`;
  limitBar.classList.remove(
    "bg-emerald-500",
    "bg-yellow-400",
    "bg-red-500",
    "bg-orange-500",
  );

  if (parentCCOwed <= 0)
    limitBar.classList.add("bg-emerald-500"); // Paid off or in credit
  else if (parentCCUsage < 50) limitBar.classList.add("bg-emerald-500");
  else if (parentCCUsage < 80) limitBar.classList.add("bg-yellow-400");
  else if (parentCCUsage <= 100) limitBar.classList.add("bg-orange-500");
  else limitBar.classList.add("bg-red-500"); // Over limit
}
function renderBudgetAndChart() {
  const spending = {};
  let totalSpending = 0;
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  // Initialize appBudgets if empty - this should ideally be loaded from Firestore or a config
  if (Object.keys(appBudgets).length === 0) {
    appBudgets = {
      food: 300,
      transport: 100,
      entertainment: 150,
      subscriptions: 50,
      shopping: 200,
      bills: 500,
      rent: 500,
      other: 100,
      income: 0,
    };
  }

  for (const category in appBudgets) {
    if (category !== "income") spending[category] = 0;
  }

  transactionsData.forEach((t) => {
    const transactionDate = new Date(
      t.date + (t.date.includes("T") ? "" : "T00:00:00"),
    );
    if (
      t.amount < 0 &&
      transactionDate.getMonth() === currentMonth &&
      transactionDate.getFullYear() === currentYear
    ) {
      const category = t.category;
      if (category !== "income" && spending.hasOwnProperty(category)) {
        // Ensure category exists in spending obj
        spending[category] += Math.abs(t.amount);
        totalSpending += Math.abs(t.amount);
      } else if (category !== "income" && !spending.hasOwnProperty(category)) {
        // Handle transactions with categories not initially in appBudgets (e.g. 'other')
        spending[category] = Math.abs(t.amount);
        totalSpending += Math.abs(t.amount);
        if (!appBudgets[category]) appBudgets[category] = 0; // Add to appBudgets if new category with 0 budget
      }
    }
  });
  const totalBudget = Object.entries(appBudgets)
    .filter(([key, value]) => key !== "income" && typeof value === "number")
    .reduce((sum, [, b]) => sum + b, 0); // Sum all expense budgets
  document.getElementById("monthlySpendingSummary").innerHTML =
    `${totalSpending.toLocaleString("en-US", { style: "currency", currency: "USD" })} <span class="text-lg font-normal text-slate-500">/ ${totalBudget.toLocaleString("en-US", { style: "currency", currency: "USD" })} Budget</span>`;
  const overallBudgetPercent =
    totalBudget > 0
      ? Math.min(100, (totalSpending / totalBudget) * 100)
      : totalSpending > 0
        ? 100
        : 0;
  document.getElementById("overallBudgetBar").style.width =
    `${overallBudgetPercent}%`;

  categoryBudgetListElement.innerHTML = "";
  const budgetColors = {
    food: "bg-yellow-400",
    entertainment: "bg-purple-400",
    subscriptions: "bg-pink-400",
    transport: "bg-sky-400",
    shopping: "bg-blue-400",
    bills: "bg-red-400",
    rent: "bg-indigo-400",
    other: "bg-slate-400",
  };

  for (const category in appBudgets) {
    if (category === "income") continue;
    const spent = spending[category] || 0;
    const limit = appBudgets[category] || 0; // Budget limit for the category
    const percent =
      limit > 0 ? Math.min(100, (spent / limit) * 100) : spent > 0 ? 100 : 0; // If no limit but spent, show 100%
    const colorClass = budgetColors[category] || "bg-slate-400";
    const li = document.createElement("li");
    li.innerHTML = `
                    <div class="flex justify-between mb-1.5">
                        <span class="font-medium capitalize text-slate-700">${category.replace(/_/g, " ")}</span>
                        <span class="text-sm text-slate-600">${spent.toLocaleString("en-US", { style: "currency", currency: "USD" })} / ${limit > 0 ? limit.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "No Limit"}</span>
                    </div>
                    <div class="w-full bg-slate-200 rounded-full h-3"> <div class="${colorClass} h-3 rounded-full transition-all duration-300 ease-out" style="width: ${percent}%"></div></div>`;
    categoryBudgetListElement.appendChild(li);
  }

  const chartLabels = Object.keys(spending).filter(
    (cat) => spending[cat] > 0 && cat !== "income",
  );
  const chartDataValues = chartLabels.map((cat) => spending[cat]);
  const chartBackgroundColors = chartLabels.map((cat) => {
    const colorMap = {
      food: "rgba(250, 204, 21, 0.8)",
      entertainment: "rgba(192, 132, 252, 0.8)",
      subscriptions: "rgba(236, 72, 153, 0.8)",
      transport: "rgba(56, 189, 248, 0.8)",
      shopping: "rgba(96, 165, 250, 0.8)",
      bills: "rgba(248, 113, 113, 0.8)",
      rent: "rgba(129, 140, 248, 0.8)",
      other: "rgba(148, 163, 184, 0.8)",
    };
    return colorMap[cat] || "rgba(148, 163, 184, 0.8)";
  });

  if (spendingPieChart && spendingPieChart.data) {
    spendingPieChart.data.labels = chartLabels.map(
      (l) => l.charAt(0).toUpperCase() + l.slice(1),
    );
    spendingPieChart.data.datasets[0].data = chartDataValues;
    spendingPieChart.data.datasets[0].backgroundColor = chartBackgroundColors;
    spendingPieChart.update();
  }
}
function renderReminders() {
  reminderListElement.innerHTML = "";
  if (remindersData.length === 0) {
    reminderListElement.innerHTML =
      '<li class="text-slate-500 italic">No reminders set yet.</li>';
    return;
  }

  const sortedReminders = [...remindersData].sort(
    (a, b) =>
      new Date(a.dueDate + "T00:00:00") - new Date(b.dueDate + "T00:00:00"),
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  sortedReminders.forEach((r) => {
    const li = document.createElement("li");
    li.className =
      "flex justify-between items-center border-b border-slate-100 pb-3 pt-1 hover:bg-slate-50 px-2 -mx-2 rounded-md";
    const dueDate = new Date(
      r.dueDate + (r.dueDate.includes("T") ? "" : "T00:00:00"),
    );
    const timeDiff = dueDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    let daysText = "";
    let daysClass = "bg-slate-100 text-slate-600";
    if (daysDiff < 0) {
      daysText = `Overdue by ${Math.abs(daysDiff)} day(s)`;
      daysClass = "bg-red-100 text-red-600";
    } else if (daysDiff === 0) {
      daysText = "Due Today";
      daysClass = "bg-yellow-100 text-yellow-700";
    } else if (daysDiff <= 7) {
      daysText = `In ${daysDiff} day(s)`;
      daysClass = "bg-orange-100 text-orange-600";
    } else {
      daysText = `In ${daysDiff} days`;
    }
    const dueDateFormatted = dueDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    li.innerHTML = `
                    <div> <p class="font-medium text-slate-800">${r.description || "No description"}</p> <p class="text-sm text-slate-500">Due: ${dueDateFormatted}</p> </div>
                    <div class="text-right flex-shrink-0"> <span class="font-medium text-sm ${daysClass} px-2 py-0.5 rounded-full">${daysText}</span>
                        <div class="mt-1 space-x-2">
                            <button onclick="editReminder('${r.id}')" class="action-button edit-button">Edit</button>
                            <button onclick="deleteReminderFromFirestore('${r.id}')" class="action-button delete-button">Delete</button>
                        </div> </div>`;
    reminderListElement.appendChild(li);
  });
}

function renderAll() {
  console.log("Rendering UI with current data...");
  renderTransactions();
  renderRecentTransactions();
  renderDashboardBalances();
  renderBudgetAndChart();
  renderReminders();
}

function setupFirestoreListeners() {
  if (db && currentUserId) {
    if (unsubscribeTransactions) unsubscribeTransactions();
    if (unsubscribeReminders) unsubscribeReminders();

    const transactionsRef = getUserCollectionRef("transactions");
    if (transactionsRef) {
      unsubscribeTransactions = transactionsRef
        .orderBy("date", "desc")
        .onSnapshot(
          (snapshot) => {
            transactionsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            console.log(
              "Firestore transactions updated via listener:",
              transactionsData.length,
            );
            renderAll();
          },
          (error) => {
            console.error("Error fetching transactions:", error);
            transactionsData = getLocalCollection("transactions");
            showToast("Using local transactions.", 3000);
            renderAll();
          },
        );
    } else {
      console.log("Could not get transactionsRef initially. Using local data.");
      transactionsData = getLocalCollection("transactions");
      renderAll();
    }

    const remindersRef = getUserCollectionRef("reminders");
    if (remindersRef) {
      unsubscribeReminders = remindersRef.orderBy("dueDate", "asc").onSnapshot(
        (snapshot) => {
          remindersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log(
            "Firestore reminders updated via listener:",
            remindersData.length,
          );
          renderReminders();
        },
        (error) => {
          console.error("Error fetching reminders:", error);
          remindersData = getLocalCollection("reminders");
          showToast("Using local reminders.", 3000);
          renderReminders();
        },
      );
    } else {
      console.log("Could not get remindersRef initially. Using local data.");
      remindersData = getLocalCollection("reminders");
      renderReminders();
    }
  } else {
    console.error(
      "Firestore (db) is not initialized or user not logged in. Using local data.",
    );
    transactionsData = getLocalCollection("transactions");
    remindersData = getLocalCollection("reminders");
    renderAll();
  }
}
// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  navigateTo(defaultSection);
  setupChatbot();
  dateInput.valueAsDate = new Date();
  showAuth();
});

transactionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(transactionForm);
  const transaction = Object.fromEntries(formData.entries());
  transaction.amount = parseFloat(transaction.amount);

  if (!transaction.date) {
    showToast("Please select a date.", 3000);
    return;
  }
  if (isNaN(transaction.amount)) {
    showToast("Please enter a valid amount.", 3000);
    return;
  } // Allow zero amount
  if (transaction.category === "income" && transaction.amount < 0) {
    showToast("Income/Payment amount must be positive.", 3000);
    amountInput.focus();
    return;
  }
  if (transaction.category !== "income" && transaction.amount > 0) {
    showToast(
      `Amount for "${transaction.category.replace(/_/g, " ")}" should be negative.`,
      5000,
    );
    amountInput.focus();
    return;
  }

  const currentEditingId = transactionIdInput.value;
  if (currentEditingId && editingTransactionId === currentEditingId) {
    transaction.id = currentEditingId;
    updateTransactionInFirestore(transaction);
  } else {
    delete transaction.transactionId; // Ensure hidden input name not saved
    addTransactionToFirestore(transaction);
  }
});

reminderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(reminderForm);
  const reminder = Object.fromEntries(formData.entries());

  if (!reminder.description || !reminder.dueDate) {
    showToast("Please enter description and due date.", 3000);
    return;
  }

  const currentEditingId = reminderIdInput.value;
  if (currentEditingId && editingReminderId === currentEditingId) {
    reminder.id = currentEditingId;
    updateReminderInFirestore(reminder);
  } else {
    delete reminder.reminderId; // Ensure hidden input name not saved
    addReminderToFirestore(reminder);
  }
});

// Function to populate form for editing a transaction
window.editTransaction = (id) => {
  // Make it global for inline onclick
  const transaction = transactionsData.find((t) => t.id === id);
  if (transaction) {
    resetTransactionForm(); // Clear form first
    editingTransactionId = id;
    transactionIdInput.value = id; // Set hidden input value
    descriptionInput.value = transaction.description;
    amountInput.value = transaction.amount;
    categorySelect.value = transaction.category;
    accountSelect.value = transaction.account;
    dateInput.value = transaction.date; // Assumes date is in 'YYYY-MM-DD'
    transactionFormTitle.textContent = "Edit Transaction";
    saveTransactionButton.textContent = "Update Transaction";
    saveTransactionButton.classList.remove(
      "bg-indigo-600",
      "hover:bg-indigo-700",
    );
    saveTransactionButton.classList.add("bg-yellow-500", "hover:bg-yellow-600");
    cancelTransactionButton.classList.remove("hidden");
    navigateTo("transactions");
    descriptionInput.focus();
  } else {
    console.error("Could not find transaction to edit with ID:", id);
    showToast("Error loading transaction for edit.", 3000);
  }
};

// Function to populate form for editing a reminder
window.editReminder = (id) => {
  // Make it global for inline onclick
  const reminder = remindersData.find((r) => r.id === id);
  if (reminder) {
    resetReminderForm();
    editingReminderId = id;
    reminderIdInput.value = id; // Set hidden input value
    reminderDescriptionInput.value = reminder.description;
    reminderDueDateInput.value = reminder.dueDate; // Assumes date is 'YYYY-MM-DD'
    reminderFormTitle.textContent = "Edit Reminder";
    saveReminderButton.textContent = "Update Reminder";
    saveReminderButton.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
    saveReminderButton.classList.add("bg-yellow-500", "hover:bg-yellow-600");
    toggleReminderForm(true); // Show the form
    reminderDescriptionInput.focus();
  } else {
    console.error("Could not find reminder to edit with ID:", id);
    showToast("Error loading reminder for edit.", 3000);
  }
};

// --- Chart.js Initialization ---
let spendingPieChart; // Declare globally
try {
  const ctx = document.getElementById("spendingPieChart").getContext("2d");
  spendingPieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        {
          label: "Spending",
          data: [],
          backgroundColor: [],
          borderColor: ["#FFFFFF"],
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // Allow chart to resize better
      plugins: {
        legend: {
          position: "bottom",
          labels: { padding: 15, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed !== null) {
                label += new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(context.parsed);
              }
              return label;
            },
          },
        },
      },
      cutout: "65%",
    },
  });
} catch (e) {
  console.error("Chart.js initialization failed:", e);
  // Handle error, maybe show a message or fallback
}

// --- Chatbot Logic (Simulation - unchanged) ---
function setupChatbot() {
  const chatbox = document.getElementById("chatbox");
  const chatInput = document.getElementById("chatInput");
  const sendChatButton = document.getElementById("sendChat");

  if (!chatbox || !chatInput || !sendChatButton) {
    console.warn("Chatbot elements not found. Skipping setup.");
    return; // Exit if elements aren't found
  }

  const addMessageToChatbox = (message, isUser = false) => {
    const bubble = document.createElement("div");
    bubble.classList.add(
      "chat-bubble",
      isUser ? "chat-bubble-user" : "chat-bubble-bot",
    );
    bubble.textContent = message;
    chatbox.appendChild(bubble);
    chatbox.scrollTop = chatbox.scrollHeight; // Auto-scroll to bottom
  };

  const getBotResponse = (userInput) => {
    userInput = userInput.toLowerCase();
    if (userInput.includes("hello") || userInput.includes("hi"))
      return "Hello there! How can I assist with your finances today?";
    if (userInput.includes("save money") || userInput.includes("saving tips"))
      return "Great question! For students in Boston, try these: \n1. Cook more meals at home. \n2. Use student discounts (MBTA pass, museums, shops). \n3. Look for free campus events for entertainment. \n4. Track your spending weekly using this app's budget feature!";
    if (userInput.includes("budget"))
      return "You can manage your budgets in the 'Budget' section. Set limits for categories like food, transport, and entertainment to stay on track.";
    if (userInput.includes("credit card") && userInput.includes("parent"))
      return "Using your parent's credit card responsibly is key. Make sure to track expenses, pay back what you owe promptly, and stay under the agreed limit to build trust and good financial habits.";
    if (userInput.includes("credit score"))
      return "Improve your credit score by: \n1. Paying all bills on time. \n2. Keeping credit card balances low (below 30% of your limit is good). \n3. Avoiding opening too many new credit accounts at once. \n4. Regularly checking your credit report for errors.";
    if (userInput.includes("emergency fund"))
      return "An emergency fund is crucial! Start small, even $10-$20 per paycheck, and build up to cover 3-6 months of essential living expenses. This can prevent debt if unexpected costs arise.";
    if (userInput.includes("student loans") || userInput.includes("debt"))
      return "Managing student loans can be daunting. Understand your loan terms, explore repayment options (like income-driven plans), and always make payments on time. Consider paying a bit extra on the principal if you can, to reduce interest over time.";
    if (
      userInput.includes("investing for students") ||
      userInput.includes("start investing")
    )
      return "It's great you're thinking about investing! Start by learning the basics. Consider opening a Roth IRA if you have earned income. Low-cost index funds or ETFs can be a good starting point. Many apps allow fractional shares, so you can start with small amounts.";
    if (userInput.includes("thank you") || userInput.includes("thanks"))
      return "You're welcome! Feel free to ask if anything else comes up.";
    return "I'm still learning! I can help with general tips on saving, budgeting, and credit. Try asking 'How can I save money?' or 'Tell me about budgeting'.";
  };

  const handleSendChat = () => {
    const userInput = chatInput.value.trim();
    if (userInput) {
      addMessageToChatbox(userInput, true);
      chatInput.value = "";
      setTimeout(() => {
        // Simulate bot thinking
        const botResponse = getBotResponse(userInput);
        addMessageToChatbox(botResponse, false);
      }, 600);
    }
  };

  sendChatButton.addEventListener("click", handleSendChat);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSendChat();
    }
  });
}
// Add this script to your index.html, right before the closing </body> tag

// Initialize offline mode handling
function initializeOfflineMode() {
  // Check if we're online and update the UI accordingly
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    console.log("Network status changed. Online:", isOnline);

    // If we went offline, show a notification but don't disrupt the app
    if (!isOnline) {
      showToast("You are offline. Some features may be limited.", 5000);
    } else {
      showToast("You are back online!", 3000);
      // Optionally refresh data from Firebase here
    }
  }

  // Set up event listeners for online/offline events
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);

  // Initial check on page load
  if (!navigator.onLine) {
    console.log("App loaded in offline mode");
    // Don't show toast immediately on load if offline - it's disruptive
    // Instead, just log it and let the app work with cached data
  }

  // When an installed PWA launches, check if service worker is ready
  if (window.matchMedia("(display-mode: standalone)").matches) {
    console.log("Application launched as PWA");

    // If service worker is ready, initialize cache
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      console.log("Service worker controller found - app should work offline");
    } else {
      console.log(
        "No service worker controller - offline functionality may be limited",
      );
      // Don't show toast - this is expected the first time the PWA is launched
    }
  }
}

// Call the function after the page has loaded
window.addEventListener("load", initializeOfflineMode);
