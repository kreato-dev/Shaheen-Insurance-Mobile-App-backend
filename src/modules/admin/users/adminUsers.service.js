const bcrypt = require('bcryptjs');
const { query } = require('../../../config/db');
const { logAdminAction } = require('../adminlogs/admin.logs.service');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function listAdmins(qp) {
  const page = Number(qp.page) || 1;
  const limit = Number(qp.limit) || 20;
  const offset = (page - 1) * limit;

  const q = qp.q ? String(qp.q).trim() : '';
  const role = qp.role ? String(qp.role).trim() : '';

  const where = [];
  const params = [];

  if (q) {
    where.push(`(full_name LIKE ? OR email LIKE ? OR mobile LIKE ?)`);
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  if (role) {
    where.push(`role = ?`);
    params.push(role);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = await query(
    `SELECT id, full_name, email, mobile, role, status, last_login_at, created_at
     FROM admins
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const countRows = await query(
    `SELECT COUNT(*) as total FROM admins ${whereSql}`,
    params
  );
  const total = countRows[0]?.total || 0;

  return {
    items: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

async function getAdminById(id) {
  const rows = await query(
    `SELECT id, full_name, email, mobile, role, status, last_login_at, created_at
     FROM admins WHERE id = ?`,
    [id]
  );
  if (!rows.length) throw httpError(404, 'Admin not found');
  return rows[0];
}

async function createAdmin(data, adminId) {
  const { fullName, email, mobile, password, role } = data;

  if (!fullName || !email || !password || !role) {
    throw httpError(400, 'Full name, email, password, and role are required');
  }

  if (role === 'SUPER_ADMIN') {
    throw httpError(403, 'Cannot create an admin with SUPER_ADMIN role');
  }

  if (role === 'CEO') {
    const ceoExists = await query(`SELECT id FROM admins WHERE role = 'CEO' LIMIT 1`);
    if (ceoExists.length > 0) {
      throw httpError(403, 'A CEO account already exists. Only one CEO is allowed.');
    }
  }

  // Check duplicates
  const existing = await query(
    `SELECT id FROM admins WHERE email = ? OR (mobile IS NOT NULL AND mobile = ?) LIMIT 1`,
    [email, mobile || '']
  );
  if (existing.length > 0) {
    throw httpError(409, 'Admin with this email or mobile already exists');
  }

  const hash = await bcrypt.hash(password, 10);

  const result = await query(
    `INSERT INTO admins (full_name, email, mobile, password_hash, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
    [fullName, email, mobile || null, hash, role]
  );

  await logAdminAction({
    adminId,
    module: 'ADMINS',
    action: 'CREATE_ADMIN',
    targetId: result.insertId,
    details: { fullName, email, role },
  });

  return { message: 'Admin created successfully' };
}

async function updateAdmin(id, data, adminId) {
  const { fullName, email, mobile, password, role, status } = data;

  // 1. Check target admin
  const targetRows = await query(`SELECT id, role FROM admins WHERE id = ?`, [id]);
  if (!targetRows.length) throw httpError(404, 'Admin not found');
  const target = targetRows[0];

  // Prevent modifying CEO
  if (target.role === 'CEO') {
    throw httpError(403, 'Cannot modify CEO account');
  }

  // Prevent promoting to CEO
  if (role === 'CEO') {
    throw httpError(403, 'Cannot set role to CEO');
  }
  if (role === 'SUPER_ADMIN') {
    throw httpError(403, 'Cannot set role to SUPER_ADMIN');
  }

  // 2. Check duplicates if email/mobile changed
  if (email || mobile) {
    const duplicate = await query(
      `SELECT id FROM admins 
       WHERE (email = ? OR (mobile IS NOT NULL AND mobile = ?)) 
       AND id != ? LIMIT 1`,
      [email || '', mobile || '', id]
    );
    if (duplicate.length > 0) {
      throw httpError(409, 'Email or mobile already in use by another admin');
    }
  }

  // 3. Build update query
  const fields = [];
  const params = [];

  if (fullName) { fields.push('full_name = ?'); params.push(fullName); }
  if (email) { fields.push('email = ?'); params.push(email); }
  if (mobile !== undefined) { fields.push('mobile = ?'); params.push(mobile || null); }
  if (role) { fields.push('role = ?'); params.push(role); }
  if (status) { fields.push('status = ?'); params.push(status); }
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    fields.push('password_hash = ?');
    params.push(hash);
  }

  if (fields.length === 0) return { message: 'No changes provided' };

  params.push(id);
  await query(`UPDATE admins SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);

  const logDetails = { ...data };
  delete logDetails.password; // Don't log the raw password

  await logAdminAction({
    adminId,
    module: 'ADMINS',
    action: 'UPDATE_ADMIN',
    targetId: id,
    details: logDetails,
  });

  return { message: 'Admin updated successfully' };
}

async function deleteAdmin(id, currentAdminId) {
  if (Number(id) === Number(currentAdminId)) {
    throw httpError(400, 'Cannot delete yourself');
  }

  const targetRows = await query(`SELECT role FROM admins WHERE id = ?`, [id]);
  if (!targetRows.length) throw httpError(404, 'Admin not found');

  if (targetRows[0].role === 'CEO') {
    throw httpError(403, 'Cannot delete CEO account');
  }
  if (targetRows[0].role === 'SUPER_ADMIN') {
    throw httpError(403, 'Cannot delete SUPER_ADMIN account');
  }

  await query(`DELETE FROM admins WHERE id = ?`, [id]);

  await logAdminAction({
    adminId: currentAdminId,
    module: 'ADMINS',
    action: 'DELETE_ADMIN',
    targetId: id,
  });

  return { message: 'Admin deleted successfully' };
}

module.exports = {
  listAdmins,
  getAdminById,
  createAdmin,
  updateAdmin,
  deleteAdmin,
};