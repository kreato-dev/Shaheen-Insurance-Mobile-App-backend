const service = require('./adminUsers.service');

exports.list = async (req, res, next) => {
  try {
    const result = await service.listAdmins(req.query);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.get = async (req, res, next) => {
  try {
    const result = await service.getAdminById(req.params.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const result = await service.createAdmin(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const result = await service.updateAdmin(req.params.id, req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const result = await service.deleteAdmin(req.params.id, req.admin.id);
    res.json(result);
  } catch (e) {
    next(e);
  }
};