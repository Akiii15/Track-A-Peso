const express = require('express');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const validateId = require('../middleware/validateId');
const { pick, round2, httpError } = require('../utils/helpers');

const router = express.Router();
router.param('id', validateId);

const FIELDS = ['name', 'type', 'openingBalance'];

// GET /api/accounts  -> every account with its current balance
router.get('/', async (req, res, next) => {
  try {
    const accounts = await Account.find().sort({ name: 1 }).lean();
    const totals = await Transaction.aggregate([
      {
        $group: {
          _id: '$account',
          income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
        },
      },
    ]);
    const byAccount = new Map(totals.map((t) => [String(t._id), t]));
    res.json(
      accounts.map((a) => {
        const t = byAccount.get(String(a._id)) || { income: 0, expense: 0 };
        return { ...a, balance: round2(a.openingBalance + t.income - t.expense) };
      })
    );
  } catch (err) {
    next(err);
  }
});

// GET /api/accounts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) throw httpError(404, 'Account not found');
    res.json(account);
  } catch (err) {
    next(err);
  }
});

// POST /api/accounts
router.post('/', async (req, res, next) => {
  try {
    const account = await Account.create(pick(req.body, FIELDS));
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
});

// PUT /api/accounts/:id
router.put('/:id', async (req, res, next) => {
  try {
    const account = await Account.findById(req.params.id);
    if (!account) throw httpError(404, 'Account not found');
    account.set(pick(req.body, FIELDS));
    await account.save();
    res.json(account);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/accounts/:id  (blocked while transactions still use it)
router.delete('/:id', async (req, res, next) => {
  try {
    const used = await Transaction.countDocuments({ account: req.params.id });
    if (used > 0) {
      throw httpError(409, `This account has ${used} transaction${used === 1 ? '' : 's'}. Delete or move them first.`);
    }
    const account = await Account.findByIdAndDelete(req.params.id);
    if (!account) throw httpError(404, 'Account not found');
    res.json({ message: 'Account deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
