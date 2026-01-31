const logsService = require('./admin.logs.service');

async function getLogs(req, res, next) {
  try {
    const result = await logsService.getAdminLogs(req.query);
    return res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getLogs };