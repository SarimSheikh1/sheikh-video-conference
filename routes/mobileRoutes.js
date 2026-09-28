const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { requireMongo } = require('../config/mongo');
const { MobileLedger, MobileMessage, MobileUsage, MobileUser } = require('../models/MobileModels');

const router = express.Router();
router.use(requireMongo);
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'), 'mobile');
fs.mkdirSync(uploadDir, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = file.mimetype === 'image/png' ? '.png' : '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
    cb(ok ? null : Object.assign(new Error('Upload a JPG or PNG image.'), { status: 400 }), ok);
  },
});

const publicUrl = (req, fileName) => `${req.protocol}://${req.get('host')}/uploads/mobile/${fileName}`;

router.get('/bootstrap', async (req, res, next) => {
  try {
    const deviceId = String(req.query.deviceId || '').trim();
    const name = String(req.query.name || 'Sheikh Tester').trim();
    if (!deviceId) return res.status(400).json({ error: 'deviceId is required.' });

    const user = await MobileUser.findOneAndUpdate(
      { deviceId },
      { $setOnInsert: { deviceId, name }, $set: { name } },
      { new: true, upsert: true },
    );
    const [messages, ledgers, usage] = await Promise.all([
      MobileMessage.find().sort({ createdAt: -1 }).limit(50).lean(),
      MobileLedger.find().sort({ createdAt: -1 }).limit(50).lean(),
      MobileUsage.find().sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const totalUsage = usage.reduce((sum, item) => ({
      minutes: sum.minutes + Number(item.minutes || 0),
      dataMb: sum.dataMb + Number(item.dataMb || 0),
    }), { minutes: 0, dataMb: 0 });
    const ledgerTotal = ledgers.reduce((sum, item) => sum + (item.kind === 'credit' ? item.amount : -item.amount), 0);

    res.json({ user, messages: messages.reverse(), ledgers, usage, totals: { ledger: ledgerTotal, ...totalUsage } });
  } catch (error) {
    next(error);
  }
});

router.post('/messages', imageUpload.single('image'), async (req, res, next) => {
  try {
    const { deviceId, text = '' } = req.body;
    const user = await MobileUser.findOne({ deviceId });
    if (!user) return res.status(401).json({ error: 'Open the app once before sending messages.' });
    if (!text.trim() && !req.file) return res.status(400).json({ error: 'Message text or image is required.' });

    const message = await MobileMessage.create({
      userId: user._id,
      userName: user.name,
      text: text.trim(),
      imageUrl: req.file ? publicUrl(req, req.file.filename) : '',
    });
    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
});

router.post('/ledgers', imageUpload.single('image'), async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!req.body.title || Number.isNaN(amount)) return res.status(400).json({ error: 'Title and numeric amount are required.' });
    const ledger = await MobileLedger.create({
      title: req.body.title,
      category: req.body.category || 'General',
      amount,
      kind: req.body.kind === 'credit' ? 'credit' : 'debit',
      note: req.body.note || '',
      imageUrl: req.file ? publicUrl(req, req.file.filename) : '',
    });
    res.status(201).json({ ledger });
  } catch (error) {
    next(error);
  }
});

router.post('/usage', async (req, res, next) => {
  try {
    const usage = await MobileUsage.create({
      label: req.body.label || 'Conference test',
      minutes: Number(req.body.minutes || 0),
      dataMb: Number(req.body.dataMb || 0),
    });
    res.status(201).json({ usage });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
