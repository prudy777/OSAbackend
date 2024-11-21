const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();
const app = express();

app.use(cors({
  origin: 'https://final-osamedic.vercel.app', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Import Mongoose models
const User = require('./models/user');
const Patient = require('./models/patient');
const TestBooking = require('./models/testbooking');
const PrintedTest = require('./models/printed');
const ContactForm = require('./models/contact');


// Twilio configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Send email
const sendEmail = (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text }, (error, info) => {
    if (error) console.error('Error sending email:', error);
    else console.log('Email sent:', info.response);
  });
};

// Send SMS
const sendSMS = (to, message) => {
  client.messages.create({ from: "+13613147013", to, body: message })
    .then(message => console.log('SMS sent:', message.sid))
    .catch(error => console.error('Error sending SMS:', error));
};

// User Registration
app.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();
    res.status(201).send('User created successfully');
  } catch (err) {
    if (err.code === 11000) return res.status(409).send('Email already exists');
    res.status(500).send('Signup failed due to server error');
  }
});

// User Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).send('User not found');
  const passwordIsValid = await bcrypt.compare(password, user.password);
  if (!passwordIsValid) return res.status(401).send('Invalid password');
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '86400' });
  res.status(200).send({ auth: true, token });
});

// Patient Registration

app.post('/register', async (req, res) => {
  try {
    const patientData = req.body;

    // Convert "No" and "Yes" strings to Boolean
    if (patientData.home_service === "No") {
      patientData.home_service = false;
    } else if (patientData.home_service === "Yes") {
      patientData.home_service = true;
    }

    // Generate a unique patient_no if not provided
    if (!patientData.patient_no) {
      const lastPatient = await Patient.findOne().sort({ _id: -1 }); // Get the last added patient
      patientData.patient_no = lastPatient ? `P${parseInt(lastPatient.patient_no.slice(1)) + 1}` : 'P1000';
    }

    const newPatient = new Patient(patientData);
    await newPatient.save();

    const emailMessage = `Dear Osamedic Diagnostics patient,\n\nThe registration for ${patientData.first_name} ${patientData.last_name} has been received.\n\nThank you.`;
    sendEmail('ailemendaniel76@gmail.com', 'Test Registration Confirmation', emailMessage);
    res.status(201).send('Patient registered successfully');
  } catch (err) {
    console.error('Error during registration:', err);
    res.status(500).send('Registration failed due to server error');
  }
});


// Get all patients
app.get('/patients', async (req, res) => {
  try {
    const patients = await Patient.find();
    res.status(200).json(patients);
  } catch (err) {
    res.status(500).send('Failed to retrieve patients');
  }
});

// Update patient status
app.put('/patients/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Check for valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send('Invalid ID format');
  }

  try {
    const updatedPatient = await Patient.findByIdAndUpdate(id, { status }, { new: true });
    if (!updatedPatient) return res.status(404).send('Patient not found');
    res.status(200).json(updatedPatient);
  } catch (err) {
    console.error('Error updating patient status:', err);
    res.status(500).send('Failed to update patient status');
  }
});
// Delete patient
app.delete('/patients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedPatient = await Patient.findByIdAndDelete(id);
    if (!deletedPatient) return res.status(404).send('Patient not found');
    res.status(200).send('Patient deleted successfully');
  } catch (err) {
    res.status(500).send('Failed to delete patient');
  }
});


app.get('/accepted-patients', async (req, res) => {
  try {
    const acceptedPatients = await Patient.find({ status: 'accepted' });
    res.status(200).json(acceptedPatients);
  } catch (err) {
    console.error('Error fetching accepted patients:', err);
    res.status(500).send('Failed to retrieve accepted patients');
  }
});

// Get a Specific Patient
app.get('/patients/:id', async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).send('Patient not found');
    res.status(200).json(patient);
  } catch (err) {
    res.status(500).send('Failed to fetch patient details');
  }
});

// Test Booking
app.post('/test-bookings', async (req, res) => {
  try {
    const { patient_no, lab_no, name, sex, age, specimen, investigation, referredBy, date } = req.body;

    // Debug incoming data
    console.log('Incoming booking data:', req.body);

    // Validate required fields
    if (!name || !sex) {
      return res.status(400).send('Name and sex are required');
    }

    // Create a new test booking
    const newBooking = new TestBooking({
      patient_no,
      lab_no,
      name,
      sex,
      age,
      specimen,
      investigation,
      referredBy,
      date: date ? new Date(date) : new Date(),
    });

    // Save the booking to the database
    const savedBooking = await newBooking.save();
    console.log('Booking saved successfully:', savedBooking);
    res.status(201).json(savedBooking);
  } catch (err) {
    console.error('Error saving booking:', err.message);
    res.status(500).send('Failed to save booking');
  }
});



// Retrieve All Test Bookings
app.get('/test-bookings', async (req, res) => {
  try {
    const bookings = await TestBooking.find();
    console.log('Retrieved bookings:', bookings); // Log retrieved data
    if (bookings.length === 0) {
      console.warn('No test bookings found in the database.');
    }
    res.status(200).json(bookings);
  } catch (err) {
    console.error('Error retrieving bookings:', err.message);
    res.status(500).send('Failed to retrieve bookings');
  }
});

app.post('/test-bookings/delete', async (req, res) => {
  const { ids } = req.body;
  console.log('Incoming IDs for deletion:', ids); // Log the IDs for debugging

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).send('No valid IDs provided.');
  }

  // Filter out invalid ObjectIDs
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    return res.status(400).send('No valid IDs provided after validation.');
  }

  try {
    const result = await TestBooking.deleteMany({ _id: { $in: validIds } });
    console.log('Delete result:', result); // Log deletion result

    if (result.deletedCount === 0) {
      return res.status(404).send('No matching records found to delete.');
    }

    res.status(200).send('Test bookings deleted successfully.');
  } catch (err) {
    console.error('Error deleting bookings:', err.message);
    res.status(500).send('Failed to delete test bookings.');
  }
});

// Handle Form Submission
app.post('/submit-contact-form', async (req, res) => {
  const { name, email, phone, message, consent } = req.body;
  try {
    const newContact = new ContactForm({ name, email, phone, message, consent });
    await newContact.save();

    sendEmail(email, 'Contact Form Submission', `Thank you, ${name}, for reaching out.`);
    sendEmail(process.env.ADMIN_EMAIL, 'New Contact Form Submission', `New contact from ${name}`);
    res.status(201).send('Form submitted successfully');
  } catch (err) {
    res.status(500).send('Failed to submit form');
  }
});

// Retrieve All Printed Tests
app.get('/printed-tests', async (req, res) => {
  console.log('Fetching printed tests...');
  try {
    const printedTests = await PrintedTest.find();
    res.status(200).json(printedTests);
  } catch (err) {
    console.error('Error fetching printed tests:', err); // Log the actual error for debugging
    res.status(500).send('Failed to retrieve printed tests');
  }
});


// Save Printed Test

app.post('/printed-tests', async (req, res) => {
  try {
    const printedTestsData = req.body.tests;

    if (!printedTestsData || !Array.isArray(printedTestsData)) {
      return res.status(400).send('Tests data must be an array');
    }

    printedTestsData.forEach(test => {
      // Validate and convert `patient_id`
      if (!test.patient_id || !mongoose.Types.ObjectId.isValid(test.patient_id)) {
        console.warn(`Invalid or missing patient_id: ${test.patient_id}, assigning default.`);
        test.patient_id = new mongoose.Types.ObjectId('000000000000000000000000'); // Default ObjectId
      } else {
        test.patient_id = new mongoose.Types.ObjectId(test.patient_id); // Convert to ObjectId
      }

      // Validate and convert `time`
      if (test.time) {
        try {
          test.time = parseTime(test.time); // Convert to valid Date object
        } catch (err) {
          console.warn(`Invalid time format for test: ${test.time}, assigning default.`);
          test.time = new Date(); // Default to current time if invalid
        }
      }
    });

    const savedTests = await PrintedTest.insertMany(printedTestsData);
    res.status(201).json(savedTests);
  } catch (error) {
    console.error('Error saving printed tests:', error.message);
    res.status(500).send(error.message || 'Failed to save printed tests');
  }
});

// Get Printed Tests Summary (Monthly, Weekly, Gender)
app.get('/printed-tests-summary', async (req, res) => {
  try {
    const monthlySummary = await PrintedTest.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          total_price: { $sum: "$price_naira" }
        }
      }
    ]);

    const weeklySummary = await PrintedTest.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%V", date: "$date" } },
          total_price: { $sum: "$price_naira" }
        }
      }
    ]);

    const genderSummary = await PrintedTest.aggregate([
      {
        $group: {
          _id: "$sex",
          total_price: { $sum: "$price_naira" }
        }
      }
    ]);

    res.status(200).json({
      monthly: monthlySummary,
      weekly: weeklySummary,
      gender: genderSummary
    });
  } catch (err) {
    res.status(500).send('Failed to retrieve printed tests summary');
  }
});

app.get('/masters', async (req, res) => {
  try {
    const printedTests = await PrintedTest.find(); // Assuming you're using Mongoose
    res.status(200).json(printedTests);
  } catch (err) {
    console.error('Error retrieving printed tests:', err);
    res.status(500).send('Failed to retrieve printed tests');
  }
});


// Start the Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});