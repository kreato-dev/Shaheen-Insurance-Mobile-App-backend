// src/modules/travel/travel.controller.js

async function calculatePremium(req, res, next) {
  try {
    const { packageType, destination, days, dob, addOns } = req.body;
    // TODO: implement business rules (age>70, +10% add-ons, etc.)
    return res.json({
      basePremium: null,
      addOnsPremium: null,
      finalPremium: null,
      sumInsured: null,
      messages: [],
    });
  } catch (err) {
    next(err);
  }
}

async function submitProposal(req, res, next) {
  try {
    const { tripDetails, applicantInfo, beneficiary, parentInfo } = req.body;
    // TODO: validate, handle student extra step, save proposal
    return res.status(201).json({
      proposalId: null,
      message: 'Travel proposal submitted (stub)',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { calculatePremium, submitProposal };
