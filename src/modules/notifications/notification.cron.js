// src/modules/notifications/notification.cron.js
const cron = require('node-cron');
const { query } = require('../../config/db');
const { fireUser, fireAdmin } = require('./notification.service');
const E = require('./notification.events');
const templates = require('./notification.templates');
const { cleanupOldOtps } = require('../auth/otp.service');

async function runPaymentReminderTPlus3() {
  // Motor
  const motor = await query(`
    SELECT mp.id, mp.user_id, u.email, u.full_name
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.submission_status='submitted'
      AND mp.payment_status='unpaid'
      AND mp.submitted_at IS NOT NULL
      AND mp.submitted_at <= (NOW() - INTERVAL 3 DAY)
      AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
  `);

  for (const r of motor) {
    await fireUser(E.PROPOSAL_PAYMENT_REMINDER_TPLUS3, {
      user_id: r.user_id,
      entity_type: 'proposal_MOTOR',
      entity_id: r.id,
      milestone: 'T+3',
      data: { proposal_type: 'MOTOR', proposal_id: r.id },
      email: templates.makeProposalPaymentReminderEmail({
        to: r.email,
        fullName: r.full_name,
        proposalLabel: `MOTOR-${r.id}`,
      }),
    });
  }

  // Travel (repeat for each table)
  const travelTables = [
    { table: 'travel_domestic_proposals', subtype: 'domestic' },
    { table: 'travel_huj_proposals', subtype: 'huj' },
    { table: 'travel_international_proposals', subtype: 'international' },
    { table: 'travel_student_proposals', subtype: 'student' },
  ];

  for (const t of travelTables) {
    const rows = await query(`
      SELECT tp.id, tp.user_id, u.email, u.full_name
      FROM ${t.table} tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.submission_status='submitted'
        AND tp.payment_status='unpaid'
        AND tp.submitted_at IS NOT NULL
        AND tp.submitted_at <= (NOW() - INTERVAL 3 DAY)
        AND (tp.expires_at IS NULL OR tp.expires_at > NOW())
    `);

    for (const r of rows) {
      await fireUser(E.PROPOSAL_PAYMENT_REMINDER_TPLUS3, {
        user_id: r.user_id,
        entity_type: `proposal_TRAVEL_${t.subtype.toUpperCase()}`,
        entity_id: r.id,
        milestone: 'T+3',
        data: { proposal_type: 'TRAVEL', travel_subtype: t.subtype, proposal_id: r.id },
        email: templates.makeProposalPaymentReminderEmail({
          to: r.email,
          fullName: r.full_name,
          proposalLabel: `TRAVEL-${r.id}`,
        }),
      });
    }
  }
}

async function runUnpaidExpiredTPlus7() {
  // Motor
  const motor = await query(`
    SELECT mp.id, mp.user_id, u.email, u.full_name
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.submission_status='submitted'
      AND mp.payment_status='unpaid'
      AND mp.expires_at IS NOT NULL
      AND mp.expires_at <= NOW()
  `);

  for (const r of motor) {
    await fireUser(E.PROPOSAL_UNPAID_EXPIRED, {
      user_id: r.user_id,
      entity_type: 'proposal_MOTOR',
      entity_id: r.id,
      milestone: 'T+7',
      data: { proposal_type: 'MOTOR', proposal_id: r.id },
      email: templates.makeProposalUnpaidExpiredEmail({
        to: r.email,
        fullName: r.full_name,
        proposalLabel: `MOTOR-${r.id}`,
      }),
    });
  }

  // Travel
  const travelTables = [
    { table: 'travel_domestic_proposals', subtype: 'domestic' },
    { table: 'travel_huj_proposals', subtype: 'huj' },
    { table: 'travel_international_proposals', subtype: 'international' },
    { table: 'travel_student_proposals', subtype: 'student' },
  ];

  for (const t of travelTables) {
    const rows = await query(`
      SELECT tp.id, tp.user_id, u.email, u.full_name
      FROM ${t.table} tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.submission_status='submitted'
        AND tp.payment_status='unpaid'
        AND tp.expires_at IS NOT NULL
        AND tp.expires_at <= NOW()
    `);

    for (const r of rows) {
      await fireUser(E.PROPOSAL_UNPAID_EXPIRED, {
        user_id: r.user_id,
        entity_type: `proposal_TRAVEL_${t.subtype.toUpperCase()}`,
        entity_id: r.id,
        milestone: 'T+7',
        data: { proposal_type: 'TRAVEL', travel_subtype: t.subtype, proposal_id: r.id },
        email: templates.makeProposalUnpaidExpiredEmail({
          to: r.email,
          fullName: r.full_name,
          proposalLabel: `TRAVEL-${r.id}`,
        }),
      });
    }
  }
}

async function runPolicyExpiringMilestones(days, userEventKey, adminEventKey) {
  // Motor
  const motor = await query(
    `
    SELECT mp.id, mp.user_id, mp.policy_no, mp.policy_expires_at, u.email, u.full_name
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.policy_status IN ('active')
      AND mp.policy_expires_at IS NOT NULL
      AND DATE(mp.policy_expires_at) = (CURDATE() + INTERVAL ? DAY)
  `,
    [days]
  );

  for (const r of motor) {
    await fireUser(userEventKey, {
      user_id: r.user_id,
      entity_type: 'policy_MOTOR',
      entity_id: r.id,
      milestone: `D${days}`,
      data: { proposal_type: 'MOTOR', proposal_id: r.id, policy_no: r.policy_no, policy_expires_at: r.policy_expires_at, days_left: days },
      email: templates.makePolicyExpiringEmail({
        to: r.email,
        fullName: r.full_name,
        policyNo: r.policy_no,
        daysLeft: days,
        policyExpiresAt: r.policy_expires_at,
      }),
    });

    await fireAdmin(adminEventKey, {
      entity_type: 'policy_MOTOR',
      entity_id: r.id,
      milestone: `D${days}`,
      data: { proposal_type: 'MOTOR', proposal_id: r.id, policy_no: r.policy_no, policy_expires_at: r.policy_expires_at, days_left: days },
      email: null,
    });
  }

  // Travel: run each proposal table
  const travelTables = [
    { table: 'travel_domestic_proposals', subtype: 'domestic' },
    { table: 'travel_huj_proposals', subtype: 'huj' },
    { table: 'travel_international_proposals', subtype: 'international' },
    { table: 'travel_student_proposals', subtype: 'student' },
  ];

  for (const t of travelTables) {
    const rows = await query(
      `
      SELECT tp.id, tp.user_id, tp.policy_no, tp.policy_expires_at, u.email, u.full_name
      FROM ${t.table} tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.policy_status IN ('active')
        AND tp.policy_expires_at IS NOT NULL
        AND DATE(tp.policy_expires_at) = (CURDATE() + INTERVAL ? DAY)
    `,
      [days]
    );

    for (const r of rows) {
      await fireUser(userEventKey, {
        user_id: r.user_id,
        entity_type: `policy_TRAVEL_${t.subtype.toUpperCase()}`,
        entity_id: r.id,
        milestone: `D${days}`,
        data: { proposal_type: 'TRAVEL', travel_subtype: t.subtype, proposal_id: r.id, policy_no: r.policy_no, policy_expires_at: r.policy_expires_at, days_left: days },
        email: templates.makePolicyExpiringEmail({
          to: r.email,
          fullName: r.full_name,
          policyNo: r.policy_no,
          daysLeft: days,
          policyExpiresAt: r.policy_expires_at,
        }),
      });

      await fireAdmin(adminEventKey, {
        entity_type: `policy_TRAVEL_${t.subtype.toUpperCase()}`,
        entity_id: r.id,
        milestone: `D${days}`,
        data: { proposal_type: 'TRAVEL', travel_subtype: t.subtype, proposal_id: r.id, policy_no: r.policy_no, policy_expires_at: r.policy_expires_at, days_left: days },
        email: null,
      });
    }
  }
}

async function runPolicyExpired() {
  // Motor
  const motor = await query(`
    SELECT mp.id, mp.user_id, mp.policy_no, mp.policy_expires_at, u.email, u.full_name
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.policy_status='active'
      AND mp.policy_expires_at IS NOT NULL
      AND mp.policy_expires_at < NOW()
  `);

  for (const r of motor) {
    // Optionally flip to expired here:
    await query(`UPDATE motor_proposals SET policy_status='expired' WHERE id=? AND policy_status='active'`, [r.id]);

    await fireUser(E.POLICY_EXPIRED, {
      user_id: r.user_id,
      entity_type: 'policy_MOTOR',
      entity_id: r.id,
      milestone: 'EXPIRED',
      data: { proposal_type: 'MOTOR', proposal_id: r.id, policy_no: r.policy_no },
      email: templates.makePolicyExpiredEmail({
        to: r.email,
        fullName: r.full_name,
        policyNo: r.policy_no,
      }),
    });

    await fireAdmin(E.ADMIN_POLICY_EXPIRED, {
      entity_type: 'policy_MOTOR',
      entity_id: r.id,
      milestone: 'EXPIRED',
      data: { proposal_type: 'MOTOR', proposal_id: r.id, policy_no: r.policy_no },
      email: null,
    });
  }

  // Travel (same flip)
  const travelTables = [
    { table: 'travel_domestic_proposals', subtype: 'domestic' },
    { table: 'travel_huj_proposals', subtype: 'huj' },
    { table: 'travel_international_proposals', subtype: 'international' },
    { table: 'travel_student_proposals', subtype: 'student' },
  ];

  for (const t of travelTables) {
    const rows = await query(`
      SELECT tp.id, tp.user_id, tp.policy_no, tp.policy_expires_at, u.email, u.full_name
      FROM ${t.table} tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.policy_status='active'
        AND tp.policy_expires_at IS NOT NULL
        AND tp.policy_expires_at < NOW()
    `);

    for (const r of rows) {
      await query(`UPDATE ${t.table} SET policy_status='expired' WHERE id=? AND policy_status='active'`, [r.id]);

      await fireUser(E.POLICY_EXPIRED, {
        user_id: r.user_id,
        entity_type: `policy_TRAVEL_${t.subtype.toUpperCase()}`,
        entity_id: r.id,
        milestone: 'EXPIRED',
        data: { proposal_type: 'TRAVEL', travel_subtype: t.subtype, proposal_id: r.id, policy_no: r.policy_no },
        email: templates.makePolicyExpiredEmail({
          to: r.email,
          fullName: r.full_name,
          policyNo: r.policy_no,
        }),
      });

      await fireAdmin(E.ADMIN_POLICY_EXPIRED, {
        entity_type: `policy_TRAVEL_${t.subtype.toUpperCase()}`,
        entity_id: r.id,
        milestone: 'EXPIRED',
        data: { proposal_type: 'TRAVEL', travel_subtype: t.subtype, proposal_id: r.id, policy_no: r.policy_no },
        email: null,
      });
    }
  }
}

async function runMotorRegNoReminderWeekly() {
  // weekly cadence key (ISO week-ish)
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil((((now - new Date(year, 0, 1)) / 86400000) + new Date(year, 0, 1).getDay() + 1) / 7);
  const milestone = `ISO_WEEK_${year}_${String(week).padStart(2, '0')}`;

  const rows = await query(`
    SELECT mp.id, mp.user_id, mp.policy_status, mp.policy_no, mp.applied_for, mp.registration_number, u.email, u.full_name
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.applied_for=1
      AND mp.payment_status='paid'
      AND (mp.registration_number IS NULL OR mp.registration_number='')
      AND mp.submission_status='submitted'
      AND mp.policy_status IN ('not_issued','active','expired')
  `);

  for (const r of rows) {
    await fireUser(E.MOTOR_REG_NO_UPLOAD_REMINDER, {
      user_id: r.user_id,
      entity_type: 'proposal_MOTOR',
      entity_id: r.id,
      milestone, // allows weekly reminders
      data: { proposal_type: 'MOTOR', proposal_id: r.id, policy_status: r.policy_status, applied_for: r.applied_for },
      email: templates.makeMotorRegNoReminderEmail({
        to: r.email,
        fullName: r.full_name,
        proposalLabel: `MOTOR-${r.id}`,
        policyNo: r.policy_no,
      }),
    });
  }
}

async function runOtpCleanup() {
  try {
    await cleanupOldOtps();
  } catch (err) {
    console.error('[CRON] OTP cleanup failed:', err);
  }
}

/*
async function runAdminLogCleanup() {
  try {
    await query(`DELETE FROM admin_activity_logs WHERE created_at < (NOW() - INTERVAL 1 YEAR)`);
  } catch (err) {
    console.error('[CRON] Admin log cleanup failed:', err);
  }
}
*/

async function runTempUserCleanup() {
  try {
    await query(`DELETE FROM temp_users WHERE created_at < (NOW() - INTERVAL 1 DAY)`);
  } catch (err) {
    console.error('[CRON] Temp user cleanup failed:', err);
  }
}

function registerNotificationCrons() {
  // 10 AM daily (Asia/Karachi server time)
  cron.schedule('0 10 * * *', runPaymentReminderTPlus3);
  cron.schedule('5 10 * * *', runUnpaidExpiredTPlus7);

  cron.schedule('10 10 * * *', async () => {
    await runPolicyExpiringMilestones(30, E.POLICY_EXPIRING_D30, E.ADMIN_POLICY_EXPIRING_D30);
    await runPolicyExpiringMilestones(15, E.POLICY_EXPIRING_D15, E.ADMIN_POLICY_EXPIRING_D15);
    await runPolicyExpiringMilestones(5,  E.POLICY_EXPIRING_D5,  E.ADMIN_POLICY_EXPIRING_D5);
    await runPolicyExpiringMilestones(1,  E.POLICY_EXPIRING_D1,  E.ADMIN_POLICY_EXPIRING_D1);
  });

  cron.schedule('15 10 * * *', runPolicyExpired);

  // weekly reg reminder (Mon 10:20)
  cron.schedule('20 10 * * 1', runMotorRegNoReminderWeekly);

  // Daily OTP cleanup at 3:00 AM
  cron.schedule('0 3 * * *', runOtpCleanup);

  // Daily Admin Log cleanup at 3:30 AM
  // cron.schedule('30 3 * * *', runAdminLogCleanup);

  // Daily Temp User cleanup at 4:00 AM
  cron.schedule('0 4 * * *', runTempUserCleanup);
}

module.exports = {
  registerNotificationCrons,
};
