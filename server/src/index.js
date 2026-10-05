import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import crypto from 'crypto';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import { User, Visitor, Appointment, Pass, CheckLog, Notification } from './models.js';
import { protect, allow, signToken } from './auth.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

const fullPass = q => q.populate({ path: 'visitor', populate: { path: 'host', select: 'name email' } });
const notify = data => Notification.create({ ...data, status: 'sent' });
const photoData = file => file ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}` : undefined;

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.post('/api/auth/login', async (req,res,next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user || !await bcrypt.compare(req.body.password, user.password)) return res.status(401).json({message:'Invalid email or password'});
    res.json({token:signToken(user),user:{id:user._id,name:user.name,email:user.email,role:user.role}});
  } catch(e) { next(e); }
});

app.post('/api/auth/register', async (req,res,next) => {
  try {
    const {name,email,password,role='employee'}=req.body;
    const allowedRoles=['employee','security','admin'];
    if(!allowedRoles.includes(role)) return res.status(400).json({message:'Invalid registration role'});
    if(await User.exists({email})) return res.status(409).json({message:'Email already exists'});
    const user=await User.create({name,email,password:await bcrypt.hash(password,10),role});
    res.status(201).json({token:signToken(user),user:{id:user._id,name,email,role}});
  } catch(e) { next(e); }
});

app.post('/api/public/visitor-register', async (req,res,next) => {
  try {
    const {name,email,password,phone,company,purpose,host,scheduledFor}=req.body;
    if(!name||!email||!password) return res.status(400).json({message:'Name, email and password are required'});
    if(await User.exists({email})) return res.status(409).json({message:'Email already exists'});
    const user=await User.create({name,email,password:await bcrypt.hash(password,10),role:'visitor'});
    const visitor=await Visitor.create({name,email,phone,company,purpose,host,user:user._id});
    let appointment=null;
    if(host) appointment=await Appointment.create({visitor:visitor._id,host,scheduledFor,status:'pending'});
    res.status(201).json({token:signToken(user),user:{id:user._id,name,email,role:user.role},visitor,appointment,message:'Visitor account created.'});
  } catch(e) { next(e); }
});

app.post('/api/public/pre-register', upload.single('photo'), async (req,res,next) => {
  try {
    const data={...req.body};
    if(req.file) data.photo=photoData(req.file);
    const visitor=await Visitor.create(data);
    const appointment=await Appointment.create({visitor:visitor._id,host:req.body.host,scheduledFor:req.body.scheduledFor,status:'pending'});
    res.status(201).json({visitor,appointment,message:'Registration submitted for approval.'});
  } catch(e) { next(e); }
});

app.get('/api/public/hosts', async (_,res) => {
  res.json(await User.find({role:{$in:['admin','employee']}}).select('name email role').sort('name'));
});
app.get('/api/users/hosts', protect, allow('admin','security','employee'), async (_,res) => {
  res.json(await User.find({role:{$in:['admin','employee']}}).select('name email role').sort('name'));
});

app.get('/api/my-visits', protect, allow('visitor'), async (req,res) => {
  res.json(await Visitor.find({user:req.user.id}).populate('host','name email').sort('-createdAt'));
});

app.get('/api/dashboard', protect, allow('admin','security','employee'), async (_,res) => {
  const start=new Date();start.setHours(0,0,0,0);
  const [visitors,active,todayVisits,pending,logs]=await Promise.all([
    Visitor.countDocuments(),
    Pass.countDocuments({status:'checked-in'}),
    CheckLog.countDocuments({at:{$gte:start},action:'check-in'}),
    Appointment.countDocuments({status:'pending'}),
    CheckLog.find().sort('-at').limit(8).populate({path:'pass',populate:{path:'visitor'}}).populate('performedBy','name')
  ]);
  res.json({visitors,active,todayVisits,pending,logs});
});

app.get('/api/visitors', protect, allow('admin','security','employee'), async (req,res) => {
  const q=req.query.q?{$or:[{name:new RegExp(req.query.q,'i')},{company:new RegExp(req.query.q,'i')},{email:new RegExp(req.query.q,'i')}]}:{};
  res.json(await Visitor.find(q).populate('host','name email').sort('-createdAt'));
});

app.post('/api/visitors', protect, allow('admin','security','employee'), upload.single('photo'), async (req,res) => {
  const data={...req.body};
  if(req.file) data.photo=photoData(req.file);
  res.status(201).json(await Visitor.create(data));
});

app.patch('/api/visitors/:id', protect, allow('admin','security','employee'), async (req,res) => {
  res.json(await Visitor.findByIdAndUpdate(req.params.id,req.body,{new:true}).populate('host','name email'));
});

app.get('/api/appointments', protect, allow('admin','security','employee'), async (_,res) => {
  res.json(await Appointment.find().populate('visitor').populate('host','name email').sort('scheduledFor'));
});

app.post('/api/appointments', protect, allow('admin','security','employee'), async (req,res) => {
  res.status(201).json(await Appointment.create(req.body));
});

app.patch('/api/appointments/:id', protect, allow('admin','employee'), async (req,res) => {
  const appointment=await Appointment.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true}).populate('visitor').populate('host');
  if(!appointment) return res.status(404).json({message:'Appointment not found'});
  if(req.body.status==='approved') await notify({recipient:appointment.visitor.email||appointment.visitor.phone,channel:appointment.visitor.email?'email':'sms',subject:'Visit approved',body:`Your visit with ${appointment.host.name} is approved.`});
  res.json(appointment);
});

app.get('/api/passes', protect, allow('admin','security','employee'), async (_,res) => res.json(await fullPass(Pass.find().sort('-createdAt'))));

app.post('/api/passes', protect, allow('admin','security'), async (req,res) => {
  const code=`VP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const qrDataUrl=await QRCode.toDataURL(JSON.stringify({code,issuedAt:new Date().toISOString()}));
  const pass=await Pass.create({...req.body,code,qrDataUrl,validFrom:req.body.validFrom||new Date(),validUntil:req.body.validUntil||new Date(Date.now()+86400000)});
  const output=await fullPass(Pass.findById(pass._id));
  if(output.visitor?.email) await notify({recipient:output.visitor.email,channel:'email',subject:'Digital visitor pass',body:`Pass code: ${code}`});
  res.status(201).json(output);
});

app.post('/api/passes/:code/scan', protect, allow('admin','security'), async (req,res) => {
  const pass=await fullPass(Pass.findOne({code:req.params.code}));
  if(!pass)return res.status(404).json({message:'Pass not found'});
  if(pass.validUntil<new Date()){pass.status='expired';await pass.save();return res.status(400).json({message:'This pass has expired'});}
  const action=pass.status==='checked-in'?'check-out':'check-in';
  pass.status=action==='check-in'?'checked-in':'checked-out';
  await pass.save();
  await CheckLog.create({pass:pass._id,action,performedBy:req.user.id});
  res.json({action,pass});
});

app.get('/api/passes/:code/badge.pdf', protect, allow('admin','security','employee'), async (req,res) => {
  const pass=await fullPass(Pass.findOne({code:req.params.code}));
  if(!pass)return res.status(404).json({message:'Pass not found'});
  res.setHeader('Content-Type','application/pdf');res.attachment(`${pass.code}-badge.pdf`);
  const pdf=new PDFDocument({size:[252,360],margin:20});pdf.pipe(res);
  pdf.rect(0,0,252,72).fill('#12372b');pdf.fillColor('white').fontSize(17).text('VISITOR PASS',20,25);
  pdf.fillColor('#17251f').fontSize(22).text(pass.visitor.name,20,100);
  pdf.fillColor('#607068').fontSize(10).text(pass.visitor.company||'Guest',20,130).text(`Host: ${pass.visitor.host?.name||'Reception'}`,20,150).text(`Valid until: ${new Date(pass.validUntil).toLocaleString()}`,20,170);
  pdf.image(Buffer.from(pass.qrDataUrl.split(',')[1],'base64'),58,200,{width:136});pdf.fillColor('#12372b').fontSize(11).text(pass.code,20,342,{align:'center'});pdf.end();
});

app.get('/api/reports/check-logs.csv', protect, allow('admin','security'), async (_,res) => {
  const logs=await CheckLog.find().sort('-at').populate({path:'pass',populate:{path:'visitor'}}).populate('performedBy','name');
  const esc=x=>`"${String(x??'').replaceAll('"','""')}"`;
  const rows=logs.map(l=>[l.at.toISOString(),l.action,l.pass?.code,l.pass?.visitor?.name,l.pass?.visitor?.company,l.performedBy?.name].map(esc).join(','));
  res.attachment('visitor-check-logs.csv').type('text/csv').send(['Timestamp,Action,Pass code,Visitor,Company,Performed by',...rows].join('\n'));
});

app.get('/api/notifications',protect,allow('admin'),async(_,res)=>res.json(await Notification.find().sort('-createdAt').limit(30)));

app.use((err,_,res,__)=>{console.error(err);res.status(500).json({message:err.message||'Something went wrong'});});
if(!process.env.MONGO_URI||!process.env.JWT_SECRET){console.error('Missing MONGO_URI or JWT_SECRET.');process.exit(1);}
mongoose.connect(process.env.MONGO_URI).then(()=>app.listen(process.env.PORT||5000,()=>console.log(`API running on port ${process.env.PORT||5000}`))).catch(err=>{console.error('MongoDB connection failed:',err.message);process.exit(1);});
