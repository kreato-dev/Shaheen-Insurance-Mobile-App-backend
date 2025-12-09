// src/modules/motor/motor.controller.js

async function calculatePremium(req, res, next) {
  try {
    const { vehicleValue, make, year, tracker } = req.body;
    // TODO: implement premium & sum insured calc
    return res.json({
      sumInsured: null,
      premium: null,
      message: 'Motor premium calculation (stub)',
    });
  } catch (err) {
    next(err);
  }
}

async function getMarketValue(req, res, next) {
  try {
    const { make, model, year } = req.body;
    // TODO: implement market value logic
    return res.json({
      marketValue: null,
      message: 'Market value (stub)',
    });
  } catch (err) {
    next(err);
  }
}

async function submitProposal(req, res, next) {
  try {
    const { personalDetails, vehicleDetails } = req.body;
    const images = req.files;
    // TODO: parse JSON, validate, save proposal + images
    return res.status(201).json({
      proposalId: null,
      message: 'Motor proposal submitted (stub)',
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  calculatePremium,
  getMarketValue,
  submitProposal,
};
