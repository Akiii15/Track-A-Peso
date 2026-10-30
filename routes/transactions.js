const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const validateId = require('../middleware/validateId');
const { pick, round2, httpError } = require('../utils/helpers');

const router = express.Router();
router.param('id', validateId);

const FIELDS = ['description', 'amount', 'type', 'date', 'account', 'category', 'note'];

// Make sure the account and category really exist and the category matches income/expense
async function checkReferences(tx) {
  const [account, category] = await Promise.all([Account.findById(tx.account), Category.findById(tx.category)]);
  if (!account) throw httpError(400, 'Selected account does not exist');
  if (!category) throw httpError(400, 'Selected category does not exist');
  if (category.type !== tx.type) {
    throw httpError(400, `"${category.name}" is an ${category.type} category - it can't be used for ${tx.type} transactions`);
  }
}

const populate = (query) => query.populate('account', 'name type').populate('category', 'name type');

/*
  GET /api/transactions
  Optional filters: ?search= &type= &category= &account= &from=YYYY-MM-DD &to=YYYY-MM-DD

  Running balance: we walk through ALL transactions oldest -> newest, adding income and
  subtracting expense, starting from the opening balance. Only AFTER that do we apply the
  filters, so the balance shown on each row stays correct even when the list is filtered.
  (If an account is selected, the balance is for that account only.)
*/
router.get('/', async (req, res, next) => {
  try {
    const { search, type, category, account, from, to } = req.query;

    let fromDate, toDate;
    if (from) {
      fromDate = new Date(from);
      if (isNaN(fromDate)) throw httpError(400, 'Invalid "from" date');
    }
    if (to) {
      toDate = new Date(to);
      if (isNaN(toDate)) throw httpError(400, 'Invalid "to" date');
      toDate = new Date(toDate.getTime() + 24 * 60 * 60 * 1000); // include the whole "to" day
    }
    for (const [label, id] of [['category', category], ['account', account]]) {
      if (id && !mongoose.isValidObjectId(id)) throw httpError(400, `Invalid ${label} ID`);
    }

    // Starting point for the running balance
    let balance = 0;
    if (account) {
      const acc = await Account.findById(account);
      balance = acc ? acc.openingBalance : 0;
    } else {
      const agg = await Account.aggregate([{ $group: { _id: null, total: { $sum: '$openingBalance' } } }]);
      balance = agg.length ? agg[0].total : 0;
    }

    const all = await populate(Transaction.find(account ? { account } : {}).sort({ date: 1, createdAt: 1 })).lean();

    let rows = all.map((t) => {
      balance = round2(balance + (t.type === 'income' ? t.amount : -t.amount));
      return { ...t, runningBalance: balance };
    });

    // Filters
    const q = search ? search.trim().toLowerCase() : '';
    rows = rows.filter((t) => {
      if (type && t.type !== type) return false;
      if (category && String(t.category && t.category._id) !== category) return false;
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date >= toDate) return false;
      if (q && !`${t.description} ${t.note || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });

    res.json(rows.reverse()); // newest first
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const tx = await populate(Transaction.findById(req.params.id));
    if (!tx) throw httpError(404, 'Transaction not found');
    res.json(tx);
  } catch (err) {
    next(err);
  }
});

// POST /api/transactions
router.post('/', async (req, res, next) => {
  try {
    const tx = new Transaction(pick(req.body, FIELDS));
    await tx.validate(); // field-level messages first (required, min, ...)
    await checkReferences(tx);
    await tx.save();
    res.status(201).json(await populate(Transaction.findById(tx._id)));
  } catch (err) {
    next(err);
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res, next) => {
  try {
    const tx = await Transaction.findById(req.params.id);
    if (!tx) throw httpError(404, 'Transaction not found');
    tx.set(pick(req.body, FIELDS));
    await tx.validate();
    await checkReferences(tx);
    await tx.save();
    res.json(await populate(Transaction.findById(tx._id)));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const tx = await Transaction.findByIdAndDelete(req.params.id);
    if (!tx) throw httpError(404, 'Transaction not found');
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
