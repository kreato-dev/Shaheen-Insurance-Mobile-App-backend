function buildMotorSelect() {
  return `
    SELECT
      'MOTOR' AS proposal_type,
      NULL AS travel_subtype,

      p.id AS proposal_id,
      p.user_id,

      p.name AS customer_name,
      u.mobile AS mobile,
      u.email AS email,
      p.cnic,

      p.sum_insured,
      p.premium AS final_premium,

      p.submission_status,
      p.payment_status,
      p.paid_at,

      p.review_status,
      p.submitted_at,
      p.expires_at,

      p.admin_last_action_by,
      p.admin_last_action_at,
      p.rejection_reason,

      p.refund_status,
      p.refund_amount,
      p.refund_reference,
      p.refund_initiated_at,
      p.refund_processed_at,
      p.closed_at,

      p.created_at,
      p.updated_at,

      p.product_type,
      p.registration_number,
      p.make_id,
      p.submake_id,
      p.model_year,
      p.assembly,

      COALESCE(d.docs_count, 0) AS docs_count,
      COALESCE(i.vehicle_images_count, 0) AS vehicle_images_count
    FROM motor_proposals p
    LEFT JOIN users u ON u.id = p.user_id
    LEFT JOIN (
      SELECT proposal_id, COUNT(*) AS docs_count
      FROM motor_documents
      GROUP BY proposal_id
    ) d ON d.proposal_id = p.id
    LEFT JOIN (
      SELECT proposal_id, COUNT(*) AS vehicle_images_count
      FROM motor_vehicle_images
      GROUP BY proposal_id
    ) i ON i.proposal_id = p.id
  `;
}

module.exports = { buildMotorSelect };