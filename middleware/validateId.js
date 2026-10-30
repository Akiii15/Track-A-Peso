const mongoose = require('mongoose');

// Use with router.param('id', validateId) -> bad IDs get a clean 400 instead of a crash
module.exports = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID format' });
  next();
};
