const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { requireMongo } = require('../config/mongo');
const { MobileMeeting, MobileMessage, MobileUser } = require('../models/MobileModels');

const router = express.Router();
router.use(requireMongo);

const avatarDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'), 'mobile-avatars');
fs.mkdirSync(avatarDir, { recursive: true });

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: avatarDir,
    filename: (req, file, cb) => {
      const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
    cb(ok ? null : Object.assign(new Error('Upload a JPG or PNG profile image.'), { status: 400 }), ok);
  },
});

const normalizeUsername = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'sheikh_user';
const publicAvatarUrl = (req, fileName) => `${req.protocol}://${req.get('host')}/uploads/mobile-avatars/${fileName}`;

async function getUser(deviceId) {
  return MobileUser.findOne({ deviceId });
}

function safeUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    friends: (user.friends || []).map(String),
  };
}

router.get('/bootstrap', async (req, res, next) => {
  try {
    const deviceId = String(req.query.deviceId || '').trim();
    const name = String(req.query.name || 'Sheikh Tester').trim();
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required.' });

    const username = normalizeUsername(req.query.username || name);
    const user = await MobileUser.findOneAndUpdate(
      { deviceId },
      { $setOnInsert: { deviceId, name, username }, $set: { name } },
      { new: true, upsert: true },
    );
    const [messages, users, meetings] = await Promise.all([
      MobileMessage.find({ roomCode: 'general' }).sort({ createdAt: -1 }).limit(50).lean(),
      MobileUser.find({ _id: { $ne: user._id } }).sort({ updatedAt: -1 }).limit(50).lean(),
      MobileMeeting.find({ participants: user._id }).sort({ updatedAt: -1 }).limit(20).lean(),
    ]);

    res.json({ user: safeUser(user), messages: messages.reverse(), users: users.map(safeUser), meetings });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', async (req, res, next) => {
  try {
    const { deviceId, name, username, bio } = req.body;
    const user = await getUser(deviceId);
    if (!user) return res.status(401).json({ error: 'Open the app once before updating profile.' });
    if (name) user.name = String(name).trim();
    if (username) user.username = normalizeUsername(username);
    if (bio !== undefined) user.bio = String(bio).trim();
    await user.save();
    res.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/profile/avatar', avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    const user = await getUser(req.body.deviceId);
    if (!user) return res.status(401).json({ error: 'Open the app once before uploading a profile image.' });
    if (!req.file) return res.status(400).json({ error: 'Choose a profile image.' });
    user.avatarUrl = publicAvatarUrl(req, req.file.filename);
    await user.save();
    res.json({ user: safeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/friends', async (req, res, next) => {
  try {
    const { deviceId, friendId } = req.body;
    const user = await getUser(deviceId);
    const friend = await MobileUser.findById(friendId);
    if (!user || !friend) return res.status(404).json({ error: 'User not found.' });
    if (!user.friends.some(id => String(id) === String(friend._id))) user.friends.push(friend._id);
    if (!friend.friends.some(id => String(id) === String(user._id))) friend.friends.push(user._id);
    await Promise.all([user.save(), friend.save()]);
    res.json({ user: safeUser(user), friend: safeUser(friend) });
  } catch (error) {
    next(error);
  }
});

router.post('/messages', async (req, res, next) => {
  try {
    const { deviceId, text = '', roomCode = 'general' } = req.body;
    const user = await getUser(deviceId);
    if (!user) return res.status(401).json({ error: 'Open the app once before sending messages.' });
    if (!text.trim()) return res.status(400).json({ error: 'Message text is required.' });

    const message = await MobileMessage.create({
      userId: user._id,
      userName: user.name,
      text: text.trim(),
      roomCode: String(roomCode || 'general').trim().toLowerCase(),
    });
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

router.post('/meetings', async (req, res, next) => {
  try {
    const user = await getUser(req.body.deviceId);
    if (!user) return res.status(401).json({ error: 'Open the app once before creating meetings.' });
    const code = crypto.randomBytes(3).toString('hex');
    const meeting = await MobileMeeting.create({
      code,
      title: req.body.title || 'Group meeting',
      hostId: user._id,
      participants: [user._id],
    });
    res.status(201).json({ meeting });
  } catch (error) {
    next(error);
  }
});

router.post('/meetings/:code/join', async (req, res, next) => {
  try {
    const user = await getUser(req.body.deviceId);
    const meeting = await MobileMeeting.findOne({ code: String(req.params.code || '').toLowerCase() });
    if (!user || !meeting) return res.status(404).json({ error: 'Meeting not found.' });
    if (!meeting.participants.some(id => String(id) === String(user._id))) meeting.participants.push(user._id);
    await meeting.save();
    res.json({ meeting });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
