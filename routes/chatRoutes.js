const router=require('express').Router();const db=require('../config/database');const {requireAuth}=require('../middleware/authMiddleware');router.use(requireAuth);
router.get('/:meetingId',(req,res)=>res.json({messages:db.prepare('SELECT m.*,u.name,u.username FROM messages m JOIN users u ON u.id=m.sender_id WHERE meeting_id=? ORDER BY m.id ASC').all(req.params.meetingId)}));
module.exports=router;
