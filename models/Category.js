const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: [40, 'Category name must be 40 characters or fewer'],
      unique: true,
    },
    // A category belongs to income OR expense, so "Salary" can't be used on an expense.
    type: {
      type: String,
      required: [true, 'Category type is required'],
      enum: { values: ['income', 'expense'], message: 'Category type must be income or expense' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
