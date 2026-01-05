function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const ALLOWED_ACTIONS = new Set(['approve', 'reject', 'reupload_required']);

function validateReviewActionBody(body) {
  const action = String(body?.action || '').trim().toLowerCase();

  if (!ALLOWED_ACTIONS.has(action)) {
    throw httpError(400, 'Invalid action. Use: approve | reject | reupload_required');
  }

  const rejectionReason =
    body?.rejection_reason != null ? String(body.rejection_reason).trim() : null;

  const reuploadNotes =
    body?.reupload_notes != null ? String(body.reupload_notes).trim() : null;

  const requiredDocs = body?.required_docs ?? null;

  if (action === 'reject') {
    if (!rejectionReason || rejectionReason.length < 3) {
      throw httpError(400, 'rejection_reason is required for reject');
    }
  }

  if (action === 'reupload_required') {
    if (!reuploadNotes || reuploadNotes.length < 3) {
      throw httpError(400, 'reupload_notes is required for reupload_required');
    }
    if (!Array.isArray(requiredDocs) || requiredDocs.length === 0) {
      throw httpError(400, 'required_docs must be a non-empty array for reupload_required');
    }
  }

  return {
    action,
    rejectionReason: action === 'reject' ? rejectionReason : null,
    reuploadNotes: action === 'reupload_required' ? reuploadNotes : null,
    requiredDocs: action === 'reupload_required' ? requiredDocs : null,
  };
}

module.exports = { validateReviewActionBody };
