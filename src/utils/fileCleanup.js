const fs = require('fs');
const path = require('path');

// project root: src/utils -> src -> project root
const projectRoot = path.join(__dirname, '..', '..');
const uploadsRoot = path.join(projectRoot, 'uploads');

function safeAbsPathFromStored(storedPath) {
  if (!storedPath) return null;

  // storedPath is like: "uploads/motor/abc.png"
  const abs = path.join(projectRoot, storedPath);
  const absNorm = path.normalize(abs);
  const uploadsNorm = path.normalize(uploadsRoot);

  // Security: never delete outside /uploads
  if (!absNorm.startsWith(uploadsNorm)) return null;

  return absNorm;
}

async function deleteFileIfExists(storedPath) {
  const abs = safeAbsPathFromStored(storedPath);
  if (!abs) return;

  try {
    await fs.promises.unlink(abs);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err; // ignore missing file
  }
}

module.exports = { deleteFileIfExists };
