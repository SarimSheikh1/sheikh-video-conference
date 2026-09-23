const jwt = require('jsonwebtoken');
const db = require('../config/database');
function tokenFrom(req) { return req.cookies.token || (req.headers.authorization || '').replace('Bearer ', ''); }
function requireAuth(req, res, next) {
  try {
    const payload = jwt.verify(tokenFrom(req), process.env.JWT_SECRET);
    const user = db.prepare('SELECT id,name,username,email,profile_image,bio,status FROM users WHERE id=?').get(payload.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    req.user = user; next();
  } catch { return res.status(401).json({ error: 'Please sign in to continue.' }); }
}
module.exports = { requireAuth, tokenFrom };
