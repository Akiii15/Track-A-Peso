const express = require('express');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const validateId = require('../middleware/validateId');
const { pick, httpError } = require('../utils/helpers');

const router = express.Router();
router.param('id', validateId);

const FIELDS = ['name', 'type'];

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    res.json(await Category.find().sort({ type: 1, name: 1 }));
  } catch (err) {
    next(err);
  }
});

// GET /api/categories/:id
router.get('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw httpError(404, 'Category not found');
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post('/', async (req, res, next) => {
  try {
    const category = await Category.create(pick(req.body, FIELDS));
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) throw httpError(404, 'Category not found');

    const changes = pick(req.body, FIELDS);
    // Changing income <-> expense would make old transactions inconsistent
    if (changes.type && changes.type !== category.type) {
      const used = await Transaction.countDocuments({ category: category._id });
      if (used > 0) throw httpError(409, 'Cannot change the type of a category that already has transactions');
    }
    category.set(changes);
    await category.save();
    res.json(category);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/categories/:id  (blocked while transactions still use it)
router.delete('/:id', async (req, res, next) => {
  try {
    const used = await Transaction.countDocuments({ category: req.params.id });
    if (used > 0) {
      throw httpError(409, `This category is used by ${used} transaction${used === 1 ? '' : 's'}. Delete or reassign them first.`);
    }
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) throw httpError(404, 'Category not found');
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
