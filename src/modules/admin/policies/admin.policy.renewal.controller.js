const { sendMotorRenewalDocService } = require('./admin.policy.renewal.service');

async function sendMotorRenewal(req, res, next) {
  try {
    const adminId = req.admin?.id || null;
    const proposalId = req.params.proposalId;

    const renewalFile = req.files?.renewal_document?.[0] || null;
    const renewalNotes = req.body?.renewal_notes || null;

    const result = await sendMotorRenewalDocService({
      adminId,
      proposalId,
      renewalFile,
      renewalNotes,
    });

    return res.status(201).json({
      message: 'Renewal document sent successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMotorRenewal };
