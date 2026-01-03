const svc = require('./adminAuth.service');

exports.login = async (req, res, next) => {
  try {
    const out = await svc.login(req.body, req);
    res.json(out);
  } catch (e) {
    next(e);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await svc.logout(req.adminSession.id);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};

exports.me = async (req, res) => {
  res.json({ admin: req.admin });
};

exports.changePassword = async (req, res, next) => {
  try {
    await svc.changePassword(req.admin.id, req.body);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
};
