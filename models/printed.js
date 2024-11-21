// models/PrintedTest.js
const mongoose = require('mongoose');

const printedTestSchema = new mongoose.Schema({
  patient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  lab_no: { type: Number, required: true },
  name: { type: String, required: true },
  sex: { type: String, required: true },
  age: { type: String, required: true },
  time: { type: Date, default: Date.now }, // Default to current time
  specimen: { type: String },
  referred_by: { type: String },
  date: { type: Date, required: true, default: Date.now },
  investigation: { type: String },
  rate: { type: Number },
  reference_range: { type: String },
  interpretation: { type: String },
  price_naira: { type: Number },
  remark: { type: String },
}, {
  timestamps: true,
});



module.exports = mongoose.model('PrintedTest', printedTestSchema);
