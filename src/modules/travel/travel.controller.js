// src/modules/travel/travel.controller.js
const {
  calculatePremiumService,
  submitProposalService,
} = require('./travel.service');

async function calculatePremium(req, res, next) {
  try {
    const {
      packageType,
      coverageType,
      startDate,
      endDate,
      tenureDays,
      dob,
      addOns,
    } = req.body;

    const result = await calculatePremiumService({
      packageType,
      coverageType,
      startDate,
      endDate,
      tenureDays,
      dob,
      addOns,
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function submitProposal(req, res, next) {
  try {
    const userId = req.user.id;
    let { tripDetails, applicantInfo, beneficiary, parentInfo } = req.body;

    // If client sends JSON string (e.g. when using multipart later), handle that:
    try {
      if (typeof tripDetails === 'string') tripDetails = JSON.parse(tripDetails);
      if (typeof applicantInfo === 'string')
        applicantInfo = JSON.parse(applicantInfo);
      if (typeof beneficiary === 'string')
        beneficiary = JSON.parse(beneficiary);
      if (typeof parentInfo === 'string' && parentInfo)
        parentInfo = JSON.parse(parentInfo);
    } catch (parseErr) {
      return next(
        Object.assign(
          new Error(
            'Invalid JSON in tripDetails/applicantInfo/beneficiary/parentInfo'
          ),
          { status: 400 }
        )
      );
    }

    const result = await submitProposalService(
      userId,
      tripDetails,
      applicantInfo,
      beneficiary,
      parentInfo
    );

    return res.status(201).json({
      message: 'Travel proposal submitted successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { calculatePremium, submitProposal };
