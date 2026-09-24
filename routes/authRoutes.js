const router = require('express').Router();
const bcrypt = require('bcrypt'); const jwt = require('jsonwebtoken'); const db = require('../config/database');
const safe = u => ({ id:u.id, name:u.name, username:u.username, email:u.email, profile_image:u.profile_image, bio:u.bio, status:u.status });
function issue(res, user, remember) { const token=jwt.sign({id:user.id},process.env.JWT_SECRET,{expiresIn:remember?'30d':'8h'}); res.cookie('token',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:remember?2592000000:28800000}); return token; }
// These names are allowed to open the app without the normal sign-in screen.
// Normalize punctuation and spaces so, for example, "Mardara Sheikh" also works.
const adminNames = new Set(['villain','mardara','sheikh','sarim']);
const normalizeName = value => (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const isAdminName = value => {
 const normalized=normalizeName(value);
 return adminNames.has(normalized) || (value || '').toLowerCase().split(/[^a-z0-9]+/).some(part=>adminNames.has(part));
};
router.post('/admin-access', async (req,res,next)=>{try{
 const name=(req.body.name || '').trim(); const normalized=normalizeName(name);
 if(!isAdminName(name)) return res.status(403).json({error:'This name does not have admin quick access.'});
 let user=db.prepare('SELECT * FROM users').all().find(candidate=>normalizeName(candidate.name)===normalized || normalizeName(candidate.username)===normalized || isAdminName(candidate.name) && normalizeName(candidate.name).includes(normalized));
 if(!user){
   const username=`admin_${normalized}`,email=`${username}@sheikh.local`;
   const password=await bcrypt.hash(require('crypto').randomUUID(),12);
   const info=db.prepare('INSERT INTO users(name,username,email,password) VALUES(?,?,?,?)').run(name,username,email,password);
   user=db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
 }
 issue(res,user,true); res.json({user:safe(user),admin:true});
}catch(e){next(e)}});
router.post('/register', async (req,res,next)=>{ try { const {name,username,email,password,confirmPassword}=req.body; if(!name||!username||!email||!password) return res.status(400).json({error:'Complete all required fields.'}); if(password.length<8) return res.status(400).json({error:'Use at least 8 characters for your password.'}); if(password!==confirmPassword) return res.status(400).json({error:'Passwords do not match.'}); const normalizedUsername=username.trim().toLowerCase(),normalizedEmail=email.trim().toLowerCase(); const existing=db.prepare('SELECT * FROM users WHERE email=? OR username=?').get(normalizedEmail,normalizedUsername); if(existing){if(await bcrypt.compare(password,existing.password)){issue(res,existing,true);return res.status(200).json({user:safe(existing),existingAccount:true});}return res.status(409).json({error:'That username or email is already registered. Please sign in, or use different details.'});} const hash=await bcrypt.hash(password,12); const info=db.prepare('INSERT INTO users(name,username,email,password) VALUES(?,?,?,?)').run(name.trim(),normalizedUsername,normalizedEmail,hash); const user=db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid); issue(res,user,true); res.status(201).json({user:safe(user)}); }catch(e){ next(e); }});
router.post('/login', async(req,res,next)=>{try{const {identity,password,remember}=req.body; const user=db.prepare('SELECT * FROM users WHERE email=? OR username=?').get((identity||'').toLowerCase(),(identity||'').toLowerCase()); if(!user||!await bcrypt.compare(password||'',user.password))return res.status(401).json({error:'Incorrect email/username or password.'}); issue(res,user,remember);res.json({user:safe(user)});}catch(e){next(e)}});
router.post('/logout',(req,res)=>{res.clearCookie('token');res.json({ok:true})});
module.exports=router;
