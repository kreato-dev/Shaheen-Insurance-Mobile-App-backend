// src/modules/motor/motor.controller.js
const {
  calculatePremiumService,
  getMarketValueService,
  submitProposalService,
  uploadMotorAssetsService,
  reuploadMotorAssetsService,
  getMotorProposalByIdForUser,
  updateMotorRegistrationNumberService,
} = require('./motor.service');

async function calculatePremium(req, res, next) {
  try {
    const { vehicleValue, year, tracker, accessoriesValue, registrationProvince } = req.body;

    const result = await calculatePremiumService({
      vehicleValue,
      year,
      tracker,
      accessoriesValue,
      registrationProvince
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

//reupload motor doc or images by proposalId
async function reuploadMotorAssets(req, res, next) {
  try {
    const userId = req.user.id;
    const proposalId = Number(req.params.proposalId);
    const files = req.files || {};

    const result = await reuploadMotorAssetsService({
      userId,
      proposalId,
      files,
    });

    return res.json({
      message: 'Motor reupload saved successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}


/**
 * Returns full proposal details for the logged-in user
 */
async function getMyProposalById(req, res, next) {
  try {
    const userId = req.user.id;
    const numericId = Number(req.params.id);

    if (!numericId || Number.isNaN(numericId)) {
      return res.status(400).json({ message: 'Invalid proposal id' });
    }

    const result = await getMotorProposalByIdForUser(userId, numericId);
    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Update registration number of the Applied vehicle
 */
async function updateRegistrationNumber(req, res, next) {
  try {
    const userId = req.user.id;
    const proposalId = Number(req.params.id);
    const { registrationNumber } = req.body;

    if (!proposalId || Number.isNaN(proposalId)) {
      return res.status(400).json({ message: 'Invalid proposal id' });
    }

    const result = await updateMotorRegistrationNumberService({
      userId,
      proposalId,
      registrationNumber,
    });

    return res.json({
      message: 'Registration number updated successfully',
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
  reuploadMotorAssets,
  getMyProposalById,
  updateRegistrationNumber
};
