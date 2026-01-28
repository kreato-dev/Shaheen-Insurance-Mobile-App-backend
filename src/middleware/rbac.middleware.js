const httpError = require('http-errors');

const ROLE_PERMS = {
  SUPER_ADMIN: ['*'],
  OPERATIONS_ADMIN: [
    'PROPOSALS:READ',
    'PROPOSALS:REVIEW',
    'USERS:READ',
    'NOTIFICATIONS:SEND',
    'CONTENT:MANAGE',
    'CONFIG:MANAGE',
    'REPORTS:EXPORT',
    'AUDIT:READ',
    'SUPPORT:READ',
    'SUPPORT:UPDATE',
    'DATA:MANAGE',
  ],
  FINANCE_ADMIN: [
    'PROPOSALS:READ',
    'REFUNDS:MANAGE',
    'PAYMENTS:MANUAL',
    'REPORTS:EXPORT',
    'AUDIT:READ',
  ],
  SUPPORT_ADMIN: [
    'PROPOSALS:READ',
    'USERS:READ',
    'USERS:RESET',
    'NOTIFICATIONS:SEND_LIMITED',
    'SUPPORT:READ',
    'SUPPORT:UPDATE',
  ],
};

module.exports = function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.admin) return next(httpError(401, 'Unauthorized'));

    const allowed = ROLE_PERMS[req.admin.role] || [];
    if (allowed.includes('*')) return next();

    const ok = perms.every((p) => allowed.includes(p));
    if (!ok) return next(httpError(403, 'Forbidden'));

    next();
  };
};
