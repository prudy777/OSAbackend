const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  dob: { type: Date, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  test_type: { type: String },
  sex: { type: String },
  home_service: { type: Boolean },
  status: { type: String, default: 'pending' },
  payment_status: { type: String, default: 'Expecting Payment' },
  patient_no: { type: String, unique: true }, // Unique constraint on patient_no
});

module.exports = mongoose.model('Patient', patientSchema);
