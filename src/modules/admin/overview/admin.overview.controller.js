const service = require('./admin.overview.service');

exports.getMotorStats = async (req, res, next) => {
  try {
    const { period, insurance_type } = req.query;
    const stats = await service.getMotorStats({
      period: period ? String(period).toUpperCase() : null,
      insurance_type,
    });
    res.json(stats);
  } catch (e) {
    next(e);
  }
};

exports.getTravelStats = async (req, res, next) => {
  try {
    const { period, insurance_type } = req.query;
    const stats = await service.getTravelStats({
      period: period ? String(period).toUpperCase() : null,
      insurance_type,
    });
    res.json(stats);
  } catch (e) {
    next(e);
  }
};

exports.getTotalRevenue = async (req, res, next) => {
  try {
    const { period, insurance_type } = req.query;
    const result = await service.getTotalRevenue({
      period: period ? String(period).toUpperCase() : null,
      insurance_type,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.getRevenueChartData = async (req, res, next) => {
  try {
    const { insurance_type } = req.query;
    const result = await service.getRevenueChartData({
      insurance_type,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.getUserStats = async (req, res, next) => {
  try {
    const { period, from, to } = req.query;
    const stats = await service.getUserStats({
      period: period ? String(period).toUpperCase() : null,
      from,
      to,
    });
    res.json(stats);
  } catch (e) {
    next(e);
  }
};