const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [100, 'Description must be 100 characters or fewer'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    type: {
      type: String,
      required: [true, 'Type is required'],
      enum: { values: ['income', 'expense'], message: 'Type must be income or expense' },
    },
    date: { type: Date, required: [true, 'Date is required'] },

    // Relationships (the "two related collections" requirement)
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: [true, 'Account is required'] },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: [true, 'Category is required'] },

    note: { type: String, trim: true, maxlength: [200, 'Note must be 200 characters or fewer'] },
  },
  { timestamps: true }
);

transactionSchema.index({ date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
