function buildTravelSelect() {
  return `
    SELECT
      'TRAVEL' AS proposal_type,
      v.travel_type AS travel_subtype,

      v.id AS proposal_id,
      v.user_id,

      CONCAT(COALESCE(v.first_name,''), ' ', COALESCE(v.last_name,'')) AS customer_name,
      v.mobile,
      v.email,
      NULL AS cnic,

      NULL AS sum_insured,
      v.final_premium,

      'submitted' AS submission_status, -- (adjust if your travel tables have submission_status)
      v.payment_status,
      NULL AS paid_at,

      v.review_status,
      NULL AS submitted_at,
      NULL AS expires_at,

      NULL AS admin_last_action_by,
      NULL AS admin_last_action_at,
      NULL AS rejection_reason,

      NULL AS refund_status,
      NULL AS refund_amount,
      NULL AS refund_reference,
      NULL AS refund_initiated_at,
      NULL AS refund_processed_at,
      NULL AS closed_at,

      v.created_at,
      v.updated_at,

      NULL AS product_type,
      NULL AS registration_number,
      NULL AS make_id,
      NULL AS submake_id,
      NULL AS model_year,
      NULL AS assembly,

      0 AS docs_count,
      0 AS vehicle_images_count
    FROM vw_travel_proposals_admin v
  `;
}

module.exports = { buildTravelSelect };
