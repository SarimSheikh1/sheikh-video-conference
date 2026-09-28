const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileUser', required: true },
  userName: { type: String, required: true },
  text: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
}, { timestamps: true });

const ledgerSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: { type: String, default: 'General', trim: true },
  amount: { type: Number, required: true },
  kind: { type: String, enum: ['credit', 'debit'], default: 'debit' },
  note: { type: String, default: '', trim: true },
  imageUrl: { type: String, default: '' },
}, { timestamps: true });

const usageSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  minutes: { type: Number, default: 0 },
  dataMb: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = {
  MobileUser: mongoose.model('MobileUser', userSchema),
  MobileMessage: mongoose.model('MobileMessage', messageSchema),
  MobileLedger: mongoose.model('MobileLedger', ledgerSchema),
  MobileUsage: mongoose.model('MobileUsage', usageSchema),
};
