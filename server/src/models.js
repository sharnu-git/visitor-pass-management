import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const userSchema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['admin', 'security', 'employee', 'visitor'], default: 'employee' }
}, { timestamps: true });

const visitorSchema = new Schema({
  name: String, email: String, phone: String, company: String, photo: String,
  host: { type: Schema.Types.ObjectId, ref: 'User' }, purpose: String,
  user: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const appointmentSchema = new Schema({
  visitor: { type: Schema.Types.ObjectId, ref: 'Visitor' },
  host: { type: Schema.Types.ObjectId, ref: 'User' },
  scheduledFor: Date,
  status: { type: String, enum: ['pending', 'approved', 'cancelled'], default: 'pending' }
}, { timestamps: true });

const passSchema = new Schema({
  visitor: { type: Schema.Types.ObjectId, ref: 'Visitor' }, code: { type: String, unique: true },
  qrDataUrl: String, validFrom: Date, validUntil: Date,
  status: { type: String, enum: ['issued', 'checked-in', 'checked-out', 'expired'], default: 'issued' }
}, { timestamps: true });

const checkLogSchema = new Schema({
  pass: { type: Schema.Types.ObjectId, ref: 'Pass' },
  action: { type: String, enum: ['check-in', 'check-out'] },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now }
});
const notificationSchema = new Schema({
  recipient: String, channel: { type: String, enum: ['email', 'sms'] },
  subject: String, body: String, status: { type: String, enum: ['queued', 'sent', 'failed'], default: 'queued' }
}, { timestamps: true });

export const User = model('User', userSchema);
export const Visitor = model('Visitor', visitorSchema);
export const Appointment = model('Appointment', appointmentSchema);
export const Pass = model('Pass', passSchema);
export const CheckLog = model('CheckLog', checkLogSchema);
export const Notification = model('Notification', notificationSchema);
