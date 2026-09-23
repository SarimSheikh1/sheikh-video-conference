require('dotenv').config();
if(process.env.NODE_ENV==='production'&&(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32))throw new Error('Set JWT_SECRET to at least 32 random characters before deployment.');
if(!process.env.JWT_SECRET)process.env.JWT_SECRET=require('crypto').randomBytes(48).toString('hex');
const path=require('path'),fs=require('fs'),http=require('http'),express=require('express'),helmet=require('helmet'),cors=require('cors'),rateLimit=require('express-rate-limit'),cookieParser=require('cookie-parser'),multer=require('multer');
const {Server}=require('socket.io');const error=require('./middleware/errorMiddleware');const {requireAuth}=require('./middleware/authMiddleware');const {register}=require('./socket/signaling');
const app=express();const server=http.createServer(app);const corsOrigin=process.env.CORS_ORIGIN||'http://localhost:3000';const io=new Server(server,{cors:{origin:corsOrigin,credentials:true}});
const uploadsDir=path.resolve(process.env.UPLOAD_DIR||path.join(__dirname,'uploads'));fs.mkdirSync(uploadsDir,{recursive:true});const upload=multer({dest:uploadsDir,limits:{fileSize:Number(process.env.MAX_FILE_SIZE)||10485760},fileFilter:(req,file,cb)=>{const ok=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/png','image/jpeg','application/zip'].includes(file.mimetype);cb(ok?null:new Error('Unsupported file type.'),ok)}});
app.use(helmet({contentSecurityPolicy:false}));app.use(cors({origin:corsOrigin,credentials:true}));app.use(rateLimit({windowMs:15*60*1000,max:300}));app.use(express.json({limit:'1mb'}));app.use(cookieParser());app.use(express.static(path.join(__dirname,'public')));app.use('/uploads',requireAuth,express.static(uploadsDir));
app.use('/api/auth',require('./routes/authRoutes'));app.use('/api/users',require('./routes/userRoutes'));app.use('/api/calls',require('./routes/callRoutes'));app.use('/api/meetings',require('./routes/meetingRoutes'));app.use('/api/messages',require('./routes/chatRoutes'));
app.post('/api/uploads',requireAuth,upload.single('file'),(req,res)=>res.status(201).json({file:{name:req.file.originalname,path:`/uploads/${req.file.filename}`}}));app.get('/api/config/ice',requireAuth,(req,res)=>{const iceServers=[{urls:'stun:stun.l.google.com:19302'}];if(process.env.TURN_SERVER_URL)iceServers.push({urls:process.env.TURN_SERVER_URL,username:process.env.TURN_USERNAME,credential:process.env.TURN_PASSWORD});res.json({iceServers})});
app.get('/api/health',(req,res)=>res.json({app:'Sheikh',ok:true}));
app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found.'}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));app.use(error);register(io);
if(require.main===module){const port=process.env.PORT||3000;server.listen(port,'0.0.0.0',()=>console.log(`Sheikh running on port ${port}`));}
module.exports={app,server,io};
