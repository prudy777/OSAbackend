const mongoose = require('mongoose');

const contactFormSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  message: { type: String, required: true },
  consent: { type: Boolean, default: false },
  submission_time: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ContactForm', contactFormSchema);
