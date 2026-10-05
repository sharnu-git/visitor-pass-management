import 'dotenv/config'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs'; import { User, Visitor, Pass } from './models.js';
await mongoose.connect(process.env.MONGO_URI);
await Promise.all([User.deleteMany(), Visitor.deleteMany(), Pass.deleteMany()]);
const password = await bcrypt.hash('Pass@123', 10);
const [admin, security, host] = await User.create([{ name: 'Ava Admin', email: 'admin@visitflow.test', password, role: 'admin' }, { name: 'Sam Security', email: 'security@visitflow.test', password, role: 'security' }, { name: 'Maya Host', email: 'maya@visitflow.test', password, role: 'employee' }]);
const visitors = await Visitor.create([{ name: 'Jordan Lee', email: 'jordan@example.com', phone: '+1 555 0142', company: 'Acme Labs', purpose: 'Product meeting', host: host._id }, { name: 'Priya Shah', email: 'priya@example.com', phone: '+1 555 0175', company: 'Nimble Co.', purpose: 'Design review', host: host._id }]);
await Pass.create({ visitor: visitors[0]._id, code: 'VP-DEMO2026', validFrom: new Date(), validUntil: new Date(Date.now() + 86400000), status: 'checked-in' });
console.log('Seed complete. Login: admin@visitflow.test / Pass@123'); await mongoose.disconnect();
