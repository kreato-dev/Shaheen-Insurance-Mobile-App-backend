const httpError = require('http-errors');

const ROLE_PERMS = {
  SUPER_ADMIN: ['*'],
  CEO: [
    'NOTIFICATIONS:READ',
    'OVERVIEW:READ_MOTOR',
    'OVERVIEW:READ_TRAVEL',
  ],
  MOTOR_ADMIN: [
    'CLAIMS:READ_MOTOR',
    'CLAIMS:REVIEW_MOTOR',
    'CONTENT:MANAGE',
    'DATA:MANAGE_MOTOR',
    'DATA:MANAGE_COMMON',
    'NOTIFICATIONS:READ',
    'OVERVIEW:READ_MOTOR',
    'POLICIES:ISSUE_MOTOR',
    'POLICIES:RENEWAL_SEND_MOTOR',
    'PROPOSALS:READ_MOTOR',
    'PROPOSALS:REVIEW_MOTOR',
    'SUPPORT:READ',
    'SUPPORT:UPDATE',
    'USERS:READ',

    'AUDIT:READ',
  ],
  TRAVEL_ADMIN: [
    // 'CLAIMS:READ_TRAVEL', // no module implemetation yet for travel claim
    // 'CLAIMS:REVIEW_TRAVEL',
    'CONTENT:MANAGE',
    // 'DATA:MANAGE_TRAVEL', // do specific travel data to manage
    'DATA:MANAGE_COMMON',
    'NOTIFICATIONS:READ',
    'OVERVIEW:READ_TRAVEL',
    'POLICIES:ISSUE_TRAVEL',
    'PROPOSALS:READ_TRAVEL',
    'PROPOSALS:REVIEW_TRAVEL',
    'SUPPORT:READ',
    'SUPPORT:UPDATE',
    'USERS:READ',

    'AUDIT:READ',
  ],
  FINANCE_ADMIN: [
    'CLAIMS:READ_MOTOR',
    // 'CLAIMS:READ_TRAVEL', // no module implemetation yet for travel claim
    'NOTIFICATIONS:READ',
    'OVERVIEW:READ_MOTOR',
    'OVERVIEW:READ_TRAVEL',
    'PROPOSALS:READ_MOTOR',
    'PROPOSALS:READ_TRAVEL',
    'REFUNDS:MANAGE',

    'PAYMENTS:MANUAL',
    'AUDIT:READ',
  ],
  SUPPORT_ADMIN: [
    'CLAIMS:READ_MOTOR',
    // 'CLAIMS:READ_TRAVEL', // no module implemetation yet for travel claim
    'NOTIFICATIONS:READ',
    'PROPOSALS:READ_MOTOR',
    'PROPOSALS:READ_TRAVEL',
    'SUPPORT:READ',
    'SUPPORT:UPDATE',
    'USERS:READ',
    'USERS:RESET',
  ],
};

module.exports = function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.admin) return next(httpError(401, 'Unauthorized'));

    const allowed = ROLE_PERMS[req.admin.role] || [];
    if (allowed.includes('*')) return next();

    const ok = perms.every((p) => {
      if (Array.isArray(p)) return p.some((sub) => allowed.includes(sub));
      return allowed.includes(p);
    });

    if (!ok) return next(httpError(403, 'Forbidden'));

    next();
  };
};
