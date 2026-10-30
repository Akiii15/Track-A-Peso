const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [60, 'Account name must be 60 characters or fewer'],
      unique: true,
    },
    type: {
      type: String,
      enum: { values: ['cash', 'bank', 'e-wallet', 'credit card'], message: 'Invalid account type' },
      default: 'cash',
    },
    openingBalance: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Account', accountSchema);
