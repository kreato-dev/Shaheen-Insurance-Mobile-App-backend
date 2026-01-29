const service = require('./admin.content.service');

exports.list = async (req, res, next) => {
  try {
    const result = await service.listBanners(req.query);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const result = await service.createBanner(req.body, req.file, req.admin.id);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const result = await service.updateBanner(req.params.id, req.body, req.file, req.admin.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await service.deleteBanner(req.params.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};