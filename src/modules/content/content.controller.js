const service = require('./content.service');

exports.getBanners = async (req, res, next) => {
  try {
    const result = await service.getActiveBanners(req.query.type);
    res.json(result);
  } catch (e) {
    next(e);
  }
};