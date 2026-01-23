const cron = require('node-cron');
const { query } = require('../config/db');

const {
  notifyUser,
  notifyAdmins,
  buildPublicFileUrl,
  makeUserPolicyExpiringEmail,
  makeUserPolicyExpiredEmail,       // ✅ ADDED
  makeAdminPolicyExpiredEmail,
  makeMotorRegNumberReminderEmail,
} = require('../modules/notifications/notification.service');

// -----------------------------
// 1) Unpaid proposal reminder after 2 days (USER notif only)
// event: PROPOSAL_SUBMITTED_UNPAID_TPLUS2
// -----------------------------
async function runUnpaidProposalReminderTPlus2() {
  // Motor proposals
  const motorRows = await query(`
    SELECT
      mp.id AS proposal_id,
      mp.user_id,
      u.email,
      mp.created_at
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.submission_status = 'submitted'
      AND mp.payment_status = 'unpaid'
      AND mp.created_at <= DATE_SUB(NOW(), INTERVAL 2 DAY)
      AND mp.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = mp.user_id
          AND n.event_key = 'PROPOSAL_SUBMITTED_UNPAID_TPLUS2'
          AND n.ref_type = 'MOTOR_PROPOSAL'
          AND n.ref_id = mp.id
      )
    LIMIT 500
  `);

  for (const r of motorRows) {
    await notifyUser({
      userId: r.user_id,
      userEmail: r.email,
      eventKey: 'PROPOSAL_SUBMITTED_UNPAID_TPLUS2',
      title: 'Proposal Submitted (Payment Pending)',
      body: 'Your proposal is submitted but payment is still pending. Please complete payment to move it to review.',
      refType: 'MOTOR_PROPOSAL',
      refId: r.proposal_id,
      data: { proposalId: r.proposal_id, proposalType: 'MOTOR' },
      email: { enabled: false }, // per your rule
    });
  }

  // Travel tables reminder
  const travelTables = [
    { code: 'DOMESTIC', table: 'travel_domestic_proposals' },
    { code: 'INTERNATIONAL', table: 'travel_international_proposals' },
    { code: 'HAJJ_UMRAH_ZIARAT', table: 'travel_huj_proposals' },
    { code: 'STUDENT_GUARD', table: 'travel_student_proposals' },
  ];

  for (const t of travelTables) {
    const travelRows = await query(
      `
      SELECT
        tp.id AS proposal_id,
        tp.user_id,
        u.email,
        tp.created_at
      FROM ${t.table} tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.submission_status = 'submitted'
        AND tp.payment_status = 'unpaid'
        AND tp.created_at <= DATE_SUB(NOW(), INTERVAL 2 DAY)
        AND tp.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = tp.user_id
            AND n.event_key = 'PROPOSAL_SUBMITTED_UNPAID_TPLUS2'
            AND n.ref_type = ?
            AND n.ref_id = tp.id
        )
      LIMIT 500
    `,
      [`TRAVEL_${t.code}_PROPOSAL`]
    );

    for (const r of travelRows) {
      await notifyUser({
        userId: r.user_id,
        userEmail: r.email,
        eventKey: 'PROPOSAL_SUBMITTED_UNPAID_TPLUS2',
        title: 'Proposal Submitted (Payment Pending)',
        body: 'Your proposal is submitted but payment is still pending. Please complete payment to move it to review.',
        refType: `TRAVEL_${t.code}_PROPOSAL`,
        refId: r.proposal_id,
        data: { proposalId: r.proposal_id, proposalType: 'TRAVEL', travelPackageCode: t.code },
        email: { enabled: false }, // per your rule
      });
    }
  }
}

// -----------------------------
// 2) Policy Expiring Soon reminders (USER notif + email)
// (30/15/5/1 days)
// -----------------------------
async function runPolicyExpiringSoon() {
  const dayOffsets = [30, 15, 5, 1];

  // MOTOR
  for (const d of dayOffsets) {
    const rows = await query(
      `
      SELECT
        mp.id AS proposal_id,
        mp.user_id,
        u.email,
        mp.policy_no,
        DATE(mp.policy_expires_at) AS expires_at,
        mp.policy_schedule_path
      FROM motor_proposals mp
      JOIN users u ON u.id = mp.user_id
      WHERE mp.policy_status = 'active'
        AND DATE(mp.policy_expires_at) = DATE_ADD(CURDATE(), INTERVAL ? DAY)
        AND mp.policy_no IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
          WHERE n.user_id = mp.user_id
            AND n.event_key = ?
            AND n.ref_type = 'MOTOR_PROPOSAL'
            AND n.ref_id = mp.id
        )
      LIMIT 500
    `,
      [d, `POLICY_EXPIRING_SOON_${d}D`]
    );

    for (const r of rows) {
      const scheduleUrl = buildPublicFileUrl(r.policy_schedule_path);
      const emailTpl = makeUserPolicyExpiringEmail({
        daysLeft: d,
        policyNo: r.policy_no,
        expiresAt: r.expires_at,
        scheduleUrl,
      });

      await notifyUser({
        userId: r.user_id,
        userEmail: r.email,
        eventKey: `POLICY_EXPIRING_SOON_${d}D`,
        title: `Policy Expiring Soon (${d} day${d === 1 ? '' : 's'})`,
        body: `Your policy will expire in ${d} day(s).`,
        refType: 'MOTOR_PROPOSAL',
        refId: r.proposal_id,
        data: {
          proposalId: r.proposal_id,
          policyNo: r.policy_no,
          expiresAt: r.expires_at,
          scheduleUrl,
          daysLeft: d,
        },
        email: { enabled: true, ...emailTpl },
      });
    }
  }

  // TRAVEL
  const travelTables = [
    { code: 'DOMESTIC', table: 'travel_domestic_proposals' },
    { code: 'INTERNATIONAL', table: 'travel_international_proposals' },
    { code: 'HAJJ_UMRAH_ZIARAT', table: 'travel_huj_proposals' },
    { code: 'STUDENT_GUARD', table: 'travel_student_proposals' },
  ];

  for (const t of travelTables) {
    for (const d of dayOffsets) {
      const rows = await query(
        `
        SELECT
          tp.id AS proposal_id,
          tp.user_id,
          u.email,
          tp.policy_no,
          DATE(tp.policy_expires_at) AS expires_at,
          tp.policy_schedule_path
        FROM ${t.table} tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.policy_status = 'active'
          AND DATE(tp.policy_expires_at) = DATE_ADD(CURDATE(), INTERVAL ? DAY)
          AND tp.policy_no IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.user_id = tp.user_id
              AND n.event_key = ?
              AND n.ref_type = ?
              AND n.ref_id = tp.id
          )
        LIMIT 500
      `,
        [d, `POLICY_EXPIRING_SOON_${d}D`, `TRAVEL_${t.code}_PROPOSAL`]
      );

      for (const r of rows) {
        const scheduleUrl = buildPublicFileUrl(r.policy_schedule_path);
        const emailTpl = makeUserPolicyExpiringEmail({
          daysLeft: d,
          policyNo: r.policy_no,
          expiresAt: r.expires_at,
          scheduleUrl,
        });

        await notifyUser({
          userId: r.user_id,
          userEmail: r.email,
          eventKey: `POLICY_EXPIRING_SOON_${d}D`,
          title: `Policy Expiring Soon (${d} day${d === 1 ? '' : 's'})`,
          body: `Your policy will expire in ${d} day(s).`,
          refType: `TRAVEL_${t.code}_PROPOSAL`,
          refId: r.proposal_id,
          data: {
            proposalId: r.proposal_id,
            policyNo: r.policy_no,
            expiresAt: r.expires_at,
            scheduleUrl,
            daysLeft: d,
            travelPackageCode: t.code,
          },
          email: { enabled: true, ...emailTpl },
        });
      }
    }
  }
}

// -----------------------------
// 3) Mark policies expired + notify USER (notif + email) + notify ADMIN (notif + email)
// event(user): POLICY_EXPIRED
// event(admin): ADMIN_POLICY_EXPIRED
// -----------------------------
async function runMarkPolicyExpiredAndNotifyAdmin() {
  // MOTOR - find active but expired
  const motorRows = await query(`
    SELECT
      mp.id AS proposal_id,
      mp.user_id,
      u.email,
      mp.policy_no,
      DATE(mp.policy_expires_at) AS expires_at
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.policy_status = 'active'
      AND mp.policy_expires_at IS NOT NULL
      AND DATE(mp.policy_expires_at) < CURDATE()
    LIMIT 500
  `);

  for (const r of motorRows) {
    // 1) mark expired
    await query(
      `UPDATE motor_proposals
         SET policy_status='expired', updated_at=NOW()
       WHERE id=? AND policy_status='active'`,
      [r.proposal_id]
    );

    // 2) notify USER (notif + email) ✅ FIX FOR ISSUE#2
    const userEmailTpl = makeUserPolicyExpiredEmail({
      policyNo: r.policy_no,
      expiresAt: r.expires_at,
    });

    await notifyUser({
      userId: r.user_id,
      userEmail: r.email,
      eventKey: 'POLICY_EXPIRED',
      title: 'Policy Expired',
      body: `Your policy has expired. Policy: ${r.policy_no || '-'}`,
      refType: 'MOTOR_PROPOSAL',
      refId: r.proposal_id,
      data: {
        proposalId: r.proposal_id,
        policyNo: r.policy_no,
        expiresAt: r.expires_at,
        proposalType: 'MOTOR',
      },
      email: { enabled: true, ...userEmailTpl },
    });

    // 3) notify ADMIN (notif + email)
    const adminEmailTpl = makeAdminPolicyExpiredEmail({
      proposalType: 'MOTOR',
      proposalId: r.proposal_id,
      policyNo: r.policy_no,
      userId: r.user_id,
    });

    await notifyAdmins({
      eventKey: 'ADMIN_POLICY_EXPIRED',
      title: 'Policy Expired (Motor)',
      body: `Motor policy expired. Proposal #${r.proposal_id} Policy: ${r.policy_no || '-'}`,
      refType: 'MOTOR_PROPOSAL',
      refId: r.proposal_id,
      data: { proposalId: r.proposal_id, policyNo: r.policy_no, userId: r.user_id },
      email: { enabled: true, ...adminEmailTpl },
    });
  }

  // TRAVEL - repeat for tables
  const travelTables = [
    { code: 'DOMESTIC', table: 'travel_domestic_proposals' },
    { code: 'INTERNATIONAL', table: 'travel_international_proposals' },
    { code: 'HAJJ_UMRAH_ZIARAT', table: 'travel_huj_proposals' },
    { code: 'STUDENT_GUARD', table: 'travel_student_proposals' },
  ];

  for (const t of travelTables) {
    const rows = await query(`
      SELECT
        tp.id AS proposal_id,
        tp.user_id,
        u.email,
        tp.policy_no,
        DATE(tp.policy_expires_at) AS expires_at
      FROM ${t.table} tp
      JOIN users u ON u.id = tp.user_id
      WHERE tp.policy_status = 'active'
        AND tp.policy_expires_at IS NOT NULL
        AND DATE(tp.policy_expires_at) < CURDATE()
      LIMIT 500
    `);

    for (const r of rows) {
      // 1) mark expired
      await query(
        `UPDATE ${t.table}
           SET policy_status='expired', updated_at=NOW()
         WHERE id=? AND policy_status='active'`,
        [r.proposal_id]
      );

      // 2) notify USER (notif + email) ✅ FIX FOR ISSUE#2
      const userEmailTpl = makeUserPolicyExpiredEmail({
        policyNo: r.policy_no,
        expiresAt: r.expires_at,
      });

      await notifyUser({
        userId: r.user_id,
        userEmail: r.email,
        eventKey: 'POLICY_EXPIRED',
        title: 'Policy Expired',
        body: `Your policy has expired. Policy: ${r.policy_no || '-'}`,
        refType: `TRAVEL_${t.code}_PROPOSAL`,
        refId: r.proposal_id,
        data: {
          proposalId: r.proposal_id,
          policyNo: r.policy_no,
          expiresAt: r.expires_at,
          proposalType: 'TRAVEL',
          travelPackageCode: t.code,
        },
        email: { enabled: true, ...userEmailTpl },
      });

      // 3) notify ADMIN (notif + email)
      const adminEmailTpl = makeAdminPolicyExpiredEmail({
        proposalType: 'TRAVEL',
        proposalId: r.proposal_id,
        policyNo: r.policy_no,
        userId: r.user_id,
      });

      await notifyAdmins({
        eventKey: 'ADMIN_POLICY_EXPIRED',
        title: `Policy Expired (Travel ${t.code})`,
        body: `Travel policy expired (${t.code}). Proposal #${r.proposal_id} Policy: ${r.policy_no || '-'}`,
        refType: `TRAVEL_${t.code}_PROPOSAL`,
        refId: r.proposal_id,
        data: { proposalId: r.proposal_id, policyNo: r.policy_no, userId: r.user_id, travelPackageCode: t.code },
        email: { enabled: true, ...adminEmailTpl },
      });
    }
  }
}

// -----------------------------
// 4) Motor RegistrationNumber Reminder (user notif + email)
// event: MOTOR_REGISTRATION_NUMBER_REMINDER_TPLUS4
// -----------------------------
async function runMotorRegistrationNumberReminderTPlus4() {
  const rows = await query(`
    SELECT
      mp.id AS proposal_id,
      mp.user_id,
      u.email,
      mp.registration_number,
      mp.applied_for,
      mp.registration_applied_at
    FROM motor_proposals mp
    JOIN users u ON u.id = mp.user_id
    WHERE mp.applied_for = 1
      AND mp.registration_applied_at IS NOT NULL
      AND mp.registration_applied_at <= DATE_SUB(NOW(), INTERVAL 4 DAY)
      AND (mp.registration_number IS NULL OR mp.registration_number = '')
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.user_id = mp.user_id
          AND n.event_key = 'MOTOR_REGISTRATION_NUMBER_REMINDER_TPLUS4'
          AND n.ref_type = 'MOTOR_PROPOSAL'
          AND n.ref_id = mp.id
      )
    LIMIT 500
  `);

  for (const r of rows) {
    const emailTpl = makeMotorRegNumberReminderEmail({ proposalId: r.proposal_id });

    await notifyUser({
      userId: r.user_id,
      userEmail: r.email,
      eventKey: 'MOTOR_REGISTRATION_NUMBER_REMINDER_TPLUS4',
      title: 'Upload Vehicle Registration Number',
      body: 'Your registration is applied for. Please upload/update the vehicle registration number.',
      refType: 'MOTOR_PROPOSAL',
      refId: r.proposal_id,
      data: { proposalId: r.proposal_id },
      email: { enabled: true, ...emailTpl },
    });
  }
}

// -----------------------------
// Scheduler registration
// -----------------------------
function registerNotificationCrons() {
  // Run daily at 09:00 PKT server time
  cron.schedule(
    '0 9 * * *',
    async () => {
      try {
        await runUnpaidProposalReminderTPlus2();
        await runPolicyExpiringSoon();
        await runMarkPolicyExpiredAndNotifyAdmin();
        await runMotorRegistrationNumberReminderTPlus4();
        console.log('[CRON] Notification jobs finished');
      } catch (e) {
        console.error('[CRON] Notification jobs failed:', e?.message);
      }
    },
    { timezone: 'Asia/Karachi' } // ✅ recommended
  );
}

module.exports = { registerNotificationCrons };
