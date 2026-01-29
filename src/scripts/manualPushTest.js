const path = require('path');
// Load env vars from project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sendPushToUser, sendPushToAdmins } = require('../modules/notifications/fcm.service');
const { pool } = require('../config/db');

(async () => {
  try {
    const type = process.argv[2]; // 'USER' or 'ADMIN'
    const id = process.argv[3];   // ID
    
    const title = "Test Notification";
    const body = `This is a manual test message sent at ${new Date().toLocaleTimeString()}`;
    const data = { click_action: "FLUTTER_NOTIFICATION_CLICK", type: "TEST" };

    if (!type || !id) {
      console.log("\nUsage: node src/scripts/manualPushTest.js <USER|ADMIN> <ID>");
      console.log("Example: node src/scripts/manualPushTest.js USER 15");
      process.exit(1);
    }

    console.log(`\n🚀 Sending Push Notification...`);
    console.log(`Target: ${type.toUpperCase()} (ID: ${id})`);
    console.log(`Title: ${title}`);
    console.log(`Body: ${body}`);

    if (type.toUpperCase() === 'USER') {
      await sendPushToUser(id, title, body, data);
    } else if (type.toUpperCase() === 'ADMIN') {
      await sendPushToAdmins(id, title, body, data);
    } else {
      console.log("❌ Invalid type. Use USER or ADMIN.");
    }

    console.log("✅ Done. Check your Firebase console or device.");
  } catch (e) {
    console.error("❌ Error:", e);
  } finally {
    pool.end(); // Close DB connection so script exits
  }
})();

// node scripts/manualPushTest.js USER 1
// node scripts/manualPushTest.js ADMIN 1
