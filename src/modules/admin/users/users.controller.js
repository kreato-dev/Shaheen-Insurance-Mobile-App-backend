const usersService = require('./users.service');

async function listUsers(req, res, next) {
  try {
    const result = await usersService.listUsers(req.query);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await usersService.getUserById(id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    // extra safety: only SUPER_ADMIN or OPERATIONS_ADMIN can do this
    const role = req.admin?.role;
    if (!['SUPER_ADMIN', 'OPERATIONS_ADMIN'].includes(role)) {
      const e = new Error('Forbidden');
      e.status = 403;
      throw e;
    }

    const id = Number(req.params.id);
    const { status } = req.body;

    const result = await usersService.updateUserStatus(id, status, req.admin.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

async function initiateUserPasswordReset(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await usersService.initiateUserPasswordReset(id, req.admin.id);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// all submitted propsal by user id 
async function getProposalsFeedofUser(req, res, next) {
  try {
    const id = Number(req.params.id);
    const { page = 1, limit = 20 } = req.query;

    const result = await usersService.getProposalsFeedService(id, {
      page: Number(page),
      limit: Number(limit),
    });

    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listUsers,
  getUserById,
  updateUserStatus,
  initiateUserPasswordReset,
  getProposalsFeedofUser,
};
