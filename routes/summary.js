const express = require('express');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const { round2, httpError } = require('../utils/helpers');

const router = express.Router();

const sumOf = (agg, type) => {
  const row = agg.find((r) => r._id === type);
  return row ? row.total : 0;
};

/*
  GET /api/summary?month=YYYY-MM   (defaults to the current month)
  Powers the dashboard: total balance, monthly income / expense / net, spending per category.
*/
router.get('/', async (req, res, next) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const match = /^(\d{4})-(\d{2})$/.exec(month);
    if (!match || +match[2] < 1 || +match[2] > 12) throw httpError(400, 'Month must look like 2026-10');

    const start = new Date(Date.UTC(+match[1], +match[2] - 1, 1));
    const end = new Date(Date.UTC(+match[1], +match[2], 1));
    const inMonth = { date: { $gte: start, $lt: end } };
    const byType = (filter) => [
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ];

    const [openings, allTime, monthly, byCategory, accounts, categories, transactions] = await Promise.all([
      Account.aggregate([{ $group: { _id: null, total: { $sum: '$openingBalance' } } }]),
      Transaction.aggregate(byType({})),
      Transaction.aggregate(byType(inMonth)),
      Transaction.aggregate([
        { $match: inMonth },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
        { $unwind: '$cat' },
        { $project: { _id: 0, name: '$cat.name', type: '$cat.type', total: 1, count: 1 } },
        { $sort: { total: -1 } },
      ]),
      Account.countDocuments(),
      Category.countDocuments(),
      Transaction.countDocuments(),
    ]);

    const monthIncome = sumOf(monthly, 'income');
    const monthExpense = sumOf(monthly, 'expense');

    res.json({
      month,
      totalBalance: round2((openings.length ? openings[0].total : 0) + sumOf(allTime, 'income') - sumOf(allTime, 'expense')),
      monthIncome: round2(monthIncome),
      monthExpense: round2(monthExpense),
      monthNet: round2(monthIncome - monthExpense),
      byCategory: byCategory.map((c) => ({ ...c, total: round2(c.total) })),
      counts: { accounts, categories, transactions },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
