const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const testBookingSchema = new mongoose.Schema({
  patient_no: { type: Number, unique: true }, // Auto-incremented field
  lab_no: { type: String, unique: true },
  name: { type: String, required: true },
  sex: { type: String, required: true },
  age: { type: Number },
  age_unit: { type: String },
  time: { type: String },
  specimen: { type: String },
  investigation: { type: String },
  referred_by: { type: String },
  date: { type: Date, required: true },
}, {
  timestamps: true,
});

// Apply auto-increment plugin for `patient_no`
testBookingSchema.plugin(AutoIncrement, { inc_field: 'patient_no' });

module.exports = mongoose.model('TestBooking', testBookingSchema);
