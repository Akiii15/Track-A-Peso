// One place that turns errors into JSON with the right status code
module.exports = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) =>
      e.name === 'CastError' ? `Invalid value for ${e.path}` : e.message
    );
    return res.status(400).json({ message: errors.join('. '), errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `That ${field} already exists` });
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
};
