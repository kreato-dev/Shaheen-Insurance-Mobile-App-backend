const { query } = require('../../../config/db');
const { deleteFileIfExists } = require('../../../utils/fileCleanup');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const APP_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:4000';

function buildUrl(path) {
  return path ? `${APP_BASE_URL}/${path.replace(/\\/g, '/')}` : null;
}

async function listBanners({ type, status, page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;
  const params = [];
  let where = 'WHERE 1=1';

  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const rows = await query(
    `SELECT * FROM content_banners ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  const total = await query(`SELECT COUNT(*) as count FROM content_banners ${where}`, params);

  return {
    items: rows.map(r => ({ ...r, imageUrl: buildUrl(r.image_path) })),
    total: total[0].count,
    page: Number(page),
    limit: Number(limit),
  };
}

async function createBanner(data, file, adminId) {
  if (!file) throw new Error('Image is required');
  
  const imagePath = `uploads/content/${file.filename}`;
  const { title, description, type, status, sort_order } = data;

  await query(
    `INSERT INTO content_banners (title, description, image_path, type, status, sort_order, created_by_admin_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [title, description, imagePath, type || 'BANNER', status || 'active', sort_order || 0, adminId]
  );

  return { message: 'Banner created successfully' };
}

async function updateBanner(id, data, file, adminId) {
  // 1. Fetch existing banner to check for 404 and get old values
  const [existingBanner] = await query('SELECT * FROM content_banners WHERE id = ?', [id]);
  if (!existingBanner) {
    throw httpError(404, 'Banner not found');
  }

  // If new file uploaded, delete old one
  if (file) {
    if (existingBanner.image_path) {
      await deleteFileIfExists(existingBanner.image_path);
    }

    const newPath = `uploads/content/${file.filename}`;
    await query(
      `UPDATE content_banners SET image_path = ? WHERE id = ?`,
      [newPath, id]
    );
  }

  // 2. Merge new data with existing data to prevent 'undefined' errors on partial updates
  const updatedData = {
    title: data.title !== undefined ? data.title : existingBanner.title,
    description: data.description !== undefined ? data.description : existingBanner.description,
    type: data.type !== undefined ? data.type : existingBanner.type,
    status: data.status !== undefined ? data.status : existingBanner.status,
    sort_order: data.sort_order !== undefined ? data.sort_order : existingBanner.sort_order,
  };

  // 3. Execute the final update with clean data
  await query(
    `UPDATE content_banners 
     SET title = ?, description = ?, type = ?, status = ?, sort_order = ?, updated_by_admin_id = ?, updated_at = NOW()
     WHERE id = ?`,
    [updatedData.title, updatedData.description, updatedData.type, updatedData.status, updatedData.sort_order, adminId, id]
  );

  return { message: 'Banner updated successfully' };
}

async function deleteBanner(id) {
  const [existingBanner] = await query('SELECT image_path FROM content_banners WHERE id = ?', [id]);
  if (existingBanner && existingBanner.image_path) {
    await deleteFileIfExists(existingBanner.image_path);
  }

  await query('DELETE FROM content_banners WHERE id = ?', [id]);
  return { message: 'Banner deleted successfully' };
}

module.exports = { listBanners, createBanner, updateBanner, deleteBanner };