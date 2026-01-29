const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool } = require('../config/db');
const crons = require('../modules/notifications/notification.cron');
const E = require('../modules/notifications/notification.events');

(async () => {
  const jobName = process.argv[2];

  console.log(`Starting Cron Test: ${jobName || 'None'}`);

  try {
    if (jobName === 'payment_reminder') {
      console.log('Running Payment Reminder (T+3)...');
      await crons.runPaymentReminderTPlus3();
    } else if (jobName === 'unpaid_expired') {
      console.log('Running Unpaid Expired (T+7)...');
      await crons.runUnpaidExpiredTPlus7();
    } else if (jobName === 'policy_expiring') {
      console.log('Running Policy Expiring (30 days)...');
      await crons.runPolicyExpiringMilestones(30, E.POLICY_EXPIRING_D30, E.ADMIN_POLICY_EXPIRING_D30);
    } else if (jobName === 'policy_expired') {
      console.log('Running Policy Expired Check...');
      await crons.runPolicyExpired();
    } else if (jobName === 'reg_reminder') {
      console.log('Running Motor Reg No Reminder...');
      await crons.runMotorRegNoReminderWeekly();
    } else {
      console.log('Usage: node src/scripts/testCrons.js <job_name>');
      console.log('Available jobs:');
      console.log('  payment_reminder');
      console.log('  unpaid_expired');
      console.log('  policy_expiring');
      console.log('  policy_expired');
      console.log('  reg_reminder');
    }
    console.log('✅ Done.');
  } catch (e) {
    console.error('❌ Error executing cron:', e);
  } finally {
    if (pool) pool.end();
    process.exit(0);
  }
})();