const svc = require('./adminAuth.service');

exports.login = async (req, res, next) => {
  try {
    const out = await svc.login(req.body, req);
    res.json(out);
  } catch (e) {
    next(e);
  }
};

exports.saveFcmToken = async (req, res, next) => {
  try {
    const { token, deviceId, platform } = req.body;
    const result = await svc.saveAdminFcmToken({
      adminId: req.admin.id,
      token,
      deviceId,
      platform,
    });
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.removeFcmToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await svc.removeAdminFcmToken({
      adminId: req.admin.id,
      token,
    });
    res.json(result);
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

exports.sendForgotPasswordOtp = async (req, res, next) => {
  try {
    const result = await svc.sendForgotPasswordOtp(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

exports.resetPasswordWithOtp = async (req, res, next) => {
  try {
    const result = await svc.resetPasswordWithOtp(req.body);
    res.json(result);
  } catch (e) {
    next(e);
  }
};
