const { issuePolicyService } = require('./admin.policy.service');

async function issuePolicy(req, res, next) {
  try {
    const adminId = req.admin?.id || null;

    // multipart/form-data fields come in req.body as strings
    const { proposalType, proposalId, travelPackageCode } = req.body;

    const policyPdf = req.files?.policy_pdf?.[0] || null;
    const schedulePdf = req.files?.schedule_pdf?.[0] || null;

    // require BOTH PDFs
    if (!policyPdf || !schedulePdf) {
      return res.status(400).json({
        message: 'Both PDFs are required: policy_pdf and schedule_pdf',
      });
    }

    const result = await issuePolicyService({
      adminId,
      proposalType,
      proposalId,
      travelPackageCode,
      uploadedDocs: {
        policyPdfPath: policyPdf.path,
        schedulePdfPath: schedulePdf.path,
      },
    });

    return res.status(201).json({
      message: 'Policy issued successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { issuePolicy };
