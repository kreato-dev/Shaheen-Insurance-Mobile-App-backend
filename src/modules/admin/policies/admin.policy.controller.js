const { issuePolicyService } = require('./admin.policy.service');

async function issuePolicy(req, res, next) {
  try {
    const adminId = req.admin?.id || null;

    const { proposalType, proposalId, travelPackageCode, policy_no } = req.body;

    const scheduleFile = req.files?.policy_schedule?.[0] || null;
    if (!scheduleFile) {
      return res.status(400).json({ message: 'policy_schedule file is required' });
    }

    const result = await issuePolicyService({
      adminId,
      proposalType,
      proposalId,
      travelPackageCode,
      policyNo: policy_no,
      scheduleFile,
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
