// src/modules/motor/motor.controller.js
const {
  calculatePremiumService,
  getMarketValueService,
  submitProposalService,
  uploadMotorAssetsService, // ✅ new service function (we’ll add in motor.service.js next)
} = require('./motor.service');

async function calculatePremium(req, res, next) {
  try {
    const { vehicleValue, year, tracker, accessoriesValue } = req.body;

    const result = await calculatePremiumService({
      vehicleValue,
      year,
      tracker,
      accessoriesValue
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getMarketValue(req, res, next) {
  try {
    const { makeId, submakeId, year } = req.body;

    const result = await getMarketValueService({
      makeId,
      submakeId,
      year,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function submitProposal(req, res, next) {
  try {
    const userId = req.user.id;

    // In multipart/form-data, these will arrive as strings
    let personalDetails = req.body.personalDetails;
    let vehicleDetails = req.body.vehicleDetails;

    try {
      if (typeof personalDetails === 'string') {
        personalDetails = JSON.parse(personalDetails);
      }
      if (typeof vehicleDetails === 'string') {
        vehicleDetails = JSON.parse(vehicleDetails);
      }
    } catch (parseErr) {
      return next(
        Object.assign(new Error('Invalid JSON in personalDetails or vehicleDetails'), {
          status: 400,
        })
      );
    }
    
    const result = await submitProposalService(
      userId, 
      personalDetails,
      vehicleDetails,
    );

    return res.status(201).json({
      message: 'Motor proposal submitted successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

// upload documents/images by proposalId and step
async function uploadMotorAssets(req, res, next) {
  try {
    const userId = req.user.id;
    const proposalId = Number(req.params.proposalId);
    const step = String(req.query.step || '').toLowerCase();

    // multer.fields => req.files is an object
    // { cnic_front: [..], cnic_back: [..] }
    const files = req.files || {};

    const result = await uploadMotorAssetsService({
      userId,
      proposalId,
      step,
      files,
    });

    return res.json({
      message: 'Motor uploads saved successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  calculatePremium,
  getMarketValue,
  submitProposal,
  uploadMotorAssets,
};
