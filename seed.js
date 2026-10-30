// Optional: fills the database with sample data for testing / demo.   Run: npm run seed
// WARNING: this deletes all existing accounts, categories and transactions first.
require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('./models/Account');
const Category = require('./models/Category');
const Transaction = require('./models/Transaction');

const day = (monthsAgo, d) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsAgo, d));
};

(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pocketbook');
  await Promise.all([Account.deleteMany({}), Category.deleteMany({}), Transaction.deleteMany({})]);

  const [cash, bank, wallet] = await Account.create([
    { name: 'Wallet Cash', type: 'cash', openingBalance: 2000 },
    { name: 'BDO Savings', type: 'bank', openingBalance: 15000 },
    { name: 'GCash', type: 'e-wallet', openingBalance: 500 },
  ]);

  const [salary, allowance, food, transport, bills, school, fun] = await Category.create([
    { name: 'Salary', type: 'income' },
    { name: 'Allowance', type: 'income' },
    { name: 'Food', type: 'expense' },
    { name: 'Transport', type: 'expense' },
    { name: 'Bills', type: 'expense' },
    { name: 'School', type: 'expense' },
    { name: 'Entertainment', type: 'expense' },
  ]);

  const tx = (description, amount, type, date, account, category) => ({ description, amount, type, date, account: account._id, category: category._id });

  await Transaction.create([
    tx('Monthly salary', 25000, 'income', day(1, 15), bank, salary),
    tx('Groceries', 2450.75, 'expense', day(1, 18), bank, food),
    tx('Electric bill', 1800, 'expense', day(1, 20), bank, bills),
    tx('Weekly allowance', 1500, 'income', day(0, 1), wallet, allowance),
    tx('Monthly salary', 25000, 'income', day(0, 2), bank, salary),
    tx('Jeepney and MRT', 320, 'expense', day(0, 3), cash, transport),
    tx('Lunch with friends', 560, 'expense', day(0, 4), wallet, food),
    tx('Internet bill', 1699, 'expense', day(0, 5), bank, bills),
    tx('Printing and school supplies', 430.5, 'expense', day(0, 6), cash, school),
    tx('Movie night', 700, 'expense', day(0, 7), wallet, fun),
  ]);

  console.log('Sample data added.');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
