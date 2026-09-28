const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, trim: true, lowercase: true, index: true },
  bio: { type: String, default: '', trim: true },
  avatarUrl: { type: String, default: '' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MobileUser' }],
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileUser', required: true },
  userName: { type: String, required: true },
  text: { type: String, required: true, trim: true },
  roomCode: { type: String, default: 'general', trim: true, lowercase: true },
}, { timestamps: true });

const meetingSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, lowercase: true },
  title: { type: String, default: 'Group meeting', trim: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'MobileUser', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MobileUser' }],
}, { timestamps: true });

module.exports = {
  MobileUser: mongoose.model('MobileUser', userSchema),
  MobileMessage: mongoose.model('MobileMessage', messageSchema),
  MobileMeeting: mongoose.model('MobileMeeting', meetingSchema),
};
