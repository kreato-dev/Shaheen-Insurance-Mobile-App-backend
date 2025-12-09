// src/modules/policy/policy.controller.js

async function getPolicies(req, res, next) {
  try {
    // TODO: get user CNIC/phone from req.user, call core API, or cache DB
    return res.json({ data: [] });
  } catch (err) {
    next(err);
  }
}

async function getPolicyById(req, res, next) {
  try {
    const { id } = req.params;
    // TODO: fetch single policy detail (pdfUrl, coverageDetails, vehicleInfo)
    return res.json({
      pdfUrl: null,
      coverageDetails: null,
      vehicleInfo: null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPolicies, getPolicyById };
