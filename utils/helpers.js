// Keep only the allowed fields from req.body
exports.pick = (obj, keys) =>
  keys.reduce((out, k) => {
    if (obj && obj[k] !== undefined) out[k] = obj[k];
    return out;
  }, {});

// Avoid floating point noise like 0.1 + 0.2 = 0.30000000000000004
exports.round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

exports.httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};
