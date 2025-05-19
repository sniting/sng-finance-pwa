// Main entry point. Consider bundling these modules for production using a tool like esbuild or webpack.
import { initFirebase } from './firebase.js';
import { setupAuth } from './auth.js';
import { setupTransactionListener } from './transactions.js';
import { setupReminderListener } from './reminders.js';
import { initChart } from './charts.js';

window.addEventListener('load', () => {
  initFirebase();
  setupAuth();
  setupTransactionListener();
  setupReminderListener();
  initChart();
});
