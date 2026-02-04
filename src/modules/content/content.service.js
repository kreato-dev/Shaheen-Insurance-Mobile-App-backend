const { query } = require('../../config/db');

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:4000';

function buildUrl(path) {
  return path ? `${APP_BASE_URL}/${path.replace(/\\/g, '/')}` : null;
}

async function getActiveBanners(type) {
  let sql = `SELECT id, title, description, image_path, type, sort_order 
             FROM content_banners 
             WHERE status = 'active'`;
  
  const params = [];
  if (type) {
    sql += ` AND type = ?`;
    params.push(type);
  }

  sql += ` ORDER BY sort_order ASC, created_at DESC`;

  const rows = await query(sql, params);

  return rows.map(r => ({ ...r, imageUrl: buildUrl(r.image_path) }));
}

module.exports = { getActiveBanners };