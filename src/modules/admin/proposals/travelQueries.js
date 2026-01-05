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
      v.cnic,

      NULL AS sum_insured,
      v.final_premium,

      v.submission_status,
      v.payment_status,
      v.paid_at,

      v.review_status,
      v.submitted_at,
      v.expires_at,

      v.admin_last_action_by,
      v.admin_last_action_at,
      v.rejection_reason,

      v.refund_status,
      v.refund_amount,
      v.refund_reference,
      v.refund_initiated_at,
      v.refund_processed_at,
      v.closed_at,

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
