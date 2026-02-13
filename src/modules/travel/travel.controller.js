// src/modules/travel/travel.controller.js
const {
  quoteTravelPremiumService,
  submitProposalService,
  listPackagesService,
  listCoveragesService,
  listPlansService,
  listSlabsService,
  getTravelProposalByIdForUser,
  uploadTravelAssetsService,
  reuploadTravelAssetsService,
} = require('./travel.service');

/**
 * POST /api/travel/quote-premium
 * Body: { packageType, coverageType, productPlan, startDate, endDate, dob, isMultiTrip }
 */
async function quotePremium(req, res, next) {
  try {
    const result = await quoteTravelPremiumService(req.body);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/travel/submit-proposal
 * Saves proposal into correct package table (Domestic/HUJ/International/Student)
 */
async function submitProposal(req, res, next) {
  try {
    // Assumes auth middleware sets req.user
    const userId = req.user.id;

    let { tripDetails, applicantInfo, beneficiary, parentInfo, familyMembers } = req.body;

    /**
     * Note:
     * If later you send multipart/form-data from frontend,
     * these fields might arrive as JSON strings.
     * So we safely parse if string.
     */
    try {
      if (typeof tripDetails === 'string') tripDetails = JSON.parse(tripDetails);
      if (typeof applicantInfo === 'string') applicantInfo = JSON.parse(applicantInfo);
      if (typeof beneficiary === 'string') beneficiary = JSON.parse(beneficiary);
      if (typeof parentInfo === 'string' && parentInfo) parentInfo = JSON.parse(parentInfo);
      if (typeof familyMembers === 'string' && familyMembers) familyMembers = JSON.parse(familyMembers);
    } catch (e) {
      return next(Object.assign(new Error('Invalid JSON in payload fields'), { status: 400 }));
    }

    const result = await submitProposalService(
      userId,
      tripDetails,
      applicantInfo,
      beneficiary,
      parentInfo,
      familyMembers
    );

    return res.status(201).json({
      message: 'Travel proposal submitted successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ✅ POST /api/travel/:packageCode/:proposalId/uploads?step=identity|ticket
 */
async function uploadTravelAssets(req, res, next) {
  try {
    const userId = req.user.id;
    const proposalId = Number(req.params.proposalId);
    const packageCodeInput = req.params.packageCode;
    const step = String(req.query.step || '').toLowerCase();
    const files = req.files || {};

    const result = await uploadTravelAssetsService({
      userId,
      proposalId,
      packageCodeInput,
      step,
      files,
    });

    return res.json({
      message: 'Travel uploads saved successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * ✅ POST /api/travel/:packageCode/:proposalId/reuploads
 */
async function reuploadTravelAssets(req, res, next) {
  try {
    const userId = req.user.id;
    const proposalId = Number(req.params.proposalId);
    const packageCodeInput = req.params.packageCode;
    const files = req.files || {};

    const result = await reuploadTravelAssetsService({
      userId,
      proposalId,
      packageCodeInput,
      files,
    });

    return res.json({
      success: true,
      message: 'Travel reupload saved successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}




/**
 * GET /api/travel/my-proposals/:id?package=INTERNATIONAL
 * Detail proposal (package is required because IDs can overlap across package tables)
 */
async function getMyProposalById(req, res, next) {
  try {
    const userId = req.user.id;
    const numericId = Number(req.params.id);
    const { package: packageCode } = req.query;

    if (!numericId || Number.isNaN(numericId)) {
      return res.status(400).json({ message: 'Invalid proposal id' });
    }
    if (!packageCode) {
      return res.status(400).json({
        message: 'package query param is required (e.g. ?package=INTERNATIONAL)',
      });
    }

    const result = await getTravelProposalByIdForUser(userId, String(packageCode), numericId);
    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  quotePremium,
  submitProposal,

  // uploads
  uploadTravelAssets,
  // reuploads
  reuploadTravelAssets,

  //get proposals
  getMyProposalById,
};
