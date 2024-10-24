const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();
const app = express();
// app.use(cors({
//   origin: 'https://frontend-osa.onrender.com', // Allow requests from your frontend URL
//   methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH','HEAD'], // Specify allowed HTTP methods
//   credentials: true ,// If you need to send cookies or authentication headers
//   optionsSuccessStatus: 200 // Some legacy browsers choke on 204
// }));
 
app.use(cors({
  origin: 'http://localhost:5173', // Vite's default dev server URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));
const db = new sqlite3.Database('./database.db');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Twilio configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Function to send email
const sendEmail = (to, subject, text) => {
  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};
// Function to send SMS message
const sendSMS = (to, message) => {
  client.messages.create({
    from:"+13613147013",
    to,
    body: message
  }).then(message => console.log('SMS message sent:', message.sid))
    .catch(error => console.error('Error sending SMS message:', error));
};

const makeCall = (to, url) => {
  client.calls.create({
    from: "+13613147013",
    to,
    url
  }).then(call => console.log('Call initiated:', call.sid))
    .catch(error => console.error('Error making call:', error));
};

// Create tables for users, patients, and test bookings
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS users`);
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      password TEXT
    )
  `);
   // Create the patients table with all required columns
    db.run(
      `CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_no INTEGER UNIQUE,
        first_name TEXT,
        last_name TEXT,
        dob TEXT,
        email TEXT,
        phone TEXT,
        test_type TEXT,
        sex TEXT,
        status TEXT DEFAULT 'pending',
        home_service TEXT,
        visit_time TEXT,
        payment_mode TEXT,
        test_submission_time TEXT
      )`,
    );
  });  


  db.run(`CREATE TABLE IF NOT EXISTS contact_form (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    message TEXT,
    consent INTEGER DEFAULT 0,
    submission_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

 
  db.run(`
    CREATE TABLE IF NOT EXISTS lab_numbers (
      lab_no INTEGER PRIMARY KEY AUTOINCREMENT
    )
  `);
 
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS test_bookings (
        test_id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_no INTEGER,
        lab_no INTEGER,
        name TEXT,
        sex TEXT,
        age TEXT,
        ageUnit TEXT,
        time TEXT,
        specimen TEXT,
        investigation TEXT,
        referredBy TEXT,
        date TEXT,
        FOREIGN KEY (patient_no) REFERENCES patients(patient_no),
        FOREIGN KEY (lab_no) REFERENCES lab_numbers(lab_no)
      )
    `, 
    );
  });
  


db.run(`DROP TABLE IF EXISTS test_details`)
  db.run(`
    CREATE TABLE IF NOT EXISTS test_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_id INTEGER,
      test_id TEXT,
      test_name TEXT,
      rate REAL,
      reference_range TEXT,
      interpretation TEXT,
      price_naira REAL,
      remark TEXT,
      FOREIGN KEY (booking_id) REFERENCES test_bookings(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      type TEXT,
      category TEXT,
      amount REAL,
      description TEXT
    )
  `);
        // Create the printed_tests table with the updated schema
        db.run(`
          CREATE TABLE IF NOT EXISTS printed_tests (
            test_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER,
            lab_no INTEGER,
            name TEXT,
            sex TEXT,
            age TEXT,
            age_unit TEXT,
            time TEXT,
            specimen TEXT,
            referred_by TEXT,
            date TEXT,
            investigation TEXT,
            rate REAL,
            reference_range TEXT,
            interpretation TEXT,
            price_naira REAL,
            remark TEXT,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_no),
            FOREIGN KEY (lab_no) REFERENCES lab_numbers(lab_no),
            FOREIGN KEY (referred_by) REFERENCES test_bookings(referredBy),
            FOREIGN KEY (time) REFERENCES test_bookings(time),
            FOREIGN KEY (specimen) REFERENCES test_bookings(specimen),
            FOREIGN KEY (investigation) REFERENCES test_bookings(investigation)
          )
        `);
        
    
  db.run(
    `CREATE TABLE IF NOT EXISTS serology (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    test TEXT,
    methodology TEXT,
    result TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS urinalysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    colour TEXT,
    appearance TEXT,
    pH TEXT,
    specific_gravity TEXT,
    urobilinogen TEXT,
    leukocyte TEXT,
    bilirubin TEXT,
    blood TEXT,
    nitrite TEXT,
    protein TEXT,
    glucose TEXT,
    ketones TEXT,
    comment TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients (id)
  )`);
  db.run(`CREATE TABLE  IF NOT EXISTS biochemistry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER,
    bilirubin_total TEXT,
    bilirubin_direct TEXT,
    ast_sgot TEXT,
    alt_sgpt TEXT,
    alp TEXT,
    albumin TEXT,
    total_protein TEXT,
    urea TEXT,
    creatinine TEXT,
    sodium TEXT,
    potassium TEXT,
    chloride TEXT,
    bicarbonate TEXT,
    total_cholesterol TEXT,
    hdl TEXT,
    ldl TEXT,
    triglycerides TEXT,
    vldl TEXT,
    fasting_blood_sugar TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients (id)
  )`);  

  
  // Create the Haematology table
      db.run(`
        CREATE TABLE IF NOT EXISTS Haematology(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          investigation TEXT NOT NULL,
          result TEXT NOT NULL,
          reference_range TEXT NOT NULL,
          booking_id INTEGER
        )
      `, 
  );
 
  

 // Create the ParasitologyTests table
 db.run(`
   CREATE TABLE IF NOT EXISTS ParasitologyTests (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     test TEXT NOT NULL,
     methodology TEXT NOT NULL,
     result TEXT NOT NULL
   )
 `);


// User registration endpoint
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(409).send('Email already exists');
      }
      return res.status(500).send('Signup failed due to server error');
    }
    res.status(201).send('User created successfully');
  });
});

// User login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) return res.status(500).send('Server error');
    if (!user) return res.status(404).send('User not found');
    const passwordIsValid = await bcrypt.compare(password, user.password);
    if (!passwordIsValid) return res.status(401).send('Invalid password');
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '86400' });
    res.status(200).send({ auth: true, token: token });
  });
});

// Patient registration endpoint
app.post('/register', async (req, res) => {
  const {
    first_name,
    last_name,
    dob,
    email,
    phone,
    test_type,
    sex,
    home_service,
    visit_time,
    payment_mode,
    test_submission_time,
  } = req.body;

  try {
    // Insert patient data into the database
    db.run(
      'INSERT INTO patients (first_name, last_name, dob, email, phone, test_type, sex, home_service, visit_time, payment_mode, test_submission_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        first_name,
        last_name,
        dob,
        email,
        phone,
        test_type,
        sex,
        home_service,
        visit_time || null, // If home_service is "No", visit_time will be null
        payment_mode,
        test_submission_time,
      ],
      function (err) {
        if (err) {
          console.error('Error inserting patient data:', err);
          return res.status(500).send('Registration failed due to server error');
        }

        const patientId = this.lastID;

        // Update the patient_no with the same value as the id
        db.run('UPDATE patients SET patient_no = ? WHERE id = ?', [patientId, patientId], function (err) {
          if (err) {
            console.error('Error updating patient number:', err);
            return res.status(500).send('Failed to set patient number');
          }

          // Send email and WhatsApp notifications to Osamedic Diagnostics
          const emailMessage = `Dear Osamedic Diagnostics,\n\nThe registration for the Test Of ${first_name} ${last_name} has been received successfully.\nTest Type: ${test_type}\n\nThank you.`;
          sendEmail('ailemendaniel76@gmail.com', 'Test Registration Confirmation', emailMessage);

          const smsMessage = `Dear Osamedic Diagnostics,\n\nThe registration for the Test Of ${first_name} ${last_name} has been received successfully.\nTest Type: ${test_type}\n\nThank you`;
          sendSMS("+2348027894448", smsMessage);

          const callUrl = 'https://demo.twilio.com/welcome/voice/';
          makeCall("+2347016724313", callUrl);

          // Send email to the client confirming test registration
          const clientEmailMessage = `Dear ${first_name} ${last_name},\n\nYour registration for the ${test_type} test has been received successfully.\nOur team will process your test shortly.\n\nThank you for choosing Osamedic Diagnostics.`;
          sendEmail(email, 'Your Test Registration Confirmation', clientEmailMessage);

          res.status(201).send('Patient registered successfully');
        });
      }
    );
  } catch (err) {
    console.error('Unexpected error during registration:', err);
    res.status(500).send('An unexpected error occurred during registration');
  }
});


//Endpoint to get list of all patients
app.get('/patients', (req, res) => {
  db.all('SELECT * FROM patients', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Failed to retrieve patients');
    }
    res.status(200).json(rows);
  });
});

// Endpoint to get a specific patient's details
app.get('/patients/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT id, first_name, last_name, dob, email, phone, test_type, status, sex, home_service FROM patients WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error('Error fetching patient details:', err);
      return res.status(500).send('Failed to fetch patient details');
    }
    if (!row) {
      return res.status(404).send('Patient not found');
    }

    // Assuming test_type is a comma-separated string
    row.test_type = row.test_type.split(',').map(type => type.trim());

    res.status(200).json(row);
  });
});

// Endpoint to get accepted patients
app.get('/accepted-patients', (req, res) => {
  db.all('SELECT * FROM patients WHERE status = "accepted"', [], (err, rows) => {
    if (err) {
      return res.status(500).send('Failed to retrieve accepted patients');
    }
    res.status(200).json(rows);
  });
});

// Endpoint to update patient status
app.put('/patients/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  db.run('UPDATE patients SET status = ? WHERE id = ?', [status, id], function (err) {
    if (err) {
      console.error('Error updating patient status:', err);
      return res.status(500).send('Failed to update patient status');
    }
    res.status(200).send('Patient status updated successfully');
  });
});

// Endpoint to update patient payment status
app.put('/patients/:id/payment-status', (req, res) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;
  db.run('UPDATE patients SET payment_status = ? WHERE id = ?', [paymentStatus, id], function (err) {
    if (err) {
      console.error('Error updating payment status:', err);
      return res.status(500).send('Failed to update payment status');
    }
    res.status(200).send('Payment status updated successfully');
  });
});

// Endpoint to delete a patient
app.delete('/patients/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM patients WHERE id = ?', id, function (err) {
    if (err) {
      console.error('Error deleting patient:', err);
      return res.status(500).send('Failed to delete patient');
    }
    res.status(200).send('Patient deleted successfully');
  });
});

// Endpoint to save test booking
app.post('/test-booking', (req, res) => {
  console.log('Received request:', req.body);
  const { patient_no, lab_no, name } = req.body;

  const testBookingQuery = `
    INSERT INTO test_bookings (patient_no, lab_no, name) 
    VALUES (?, ?, ?)
  `;
  db.run(testBookingQuery, [patient_no, lab_no, name], function (err) {
    if (err) {
      console.error('Error saving booking:', err);
      return res.status(500).send('Failed to save booking');
    }
    console.log(`New booking inserted with ID ${this.lastID}`);
    res.status(201).send('Booking saved');
  });
});


// Endpoint to delete test booking by IDs
app.post('/test-booking/:id', async (req, res) => {
  const { id } = req.params;
  
  const runQuery = (query, params) => {
    return new Promise((resolve, reject) => {
      db.run(query, params, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  };

  try {
    await runQuery('BEGIN TRANSACTION');
    
    await runQuery('DELETE FROM test_bookings WHERE test_id = ?', [id]);
    await runQuery('DELETE FROM test_details WHERE booking_id = ?', [id]);
    await runQuery('DELETE FROM serology WHERE id = ?', [id]);
    await runQuery('DELETE FROM urinalysis WHERE id = ?', [id]);
    await runQuery('DELETE FROM biochemistry WHERE id = ?', [id]);
    await runQuery('DELETE FROM Haematology WHERE id = ?', [id]);
    await runQuery('DELETE FROM ParasitologyTests WHERE id = ?', [id]);

    await runQuery('COMMIT');
    res.status(200).send('Test booking deleted successfully');
  } catch (err) {
    await runQuery('ROLLBACK');
    console.error('Error deleting test booking:', err);
    res.status(500).send('Failed to delete test booking');
  }
});


// Endpoint to get all test bookings
app.get('/test-bookings', (req, res) => {
  const query = 'SELECT * FROM test_bookings';
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error retrieving bookings:', err.message);
      return res.status(500).send('Failed to retrieve bookings');
    }

    console.log(`Bookings retrieved: ${JSON.stringify(rows)}`); // Log the retrieved data

    if (rows.length === 0) {
      console.warn('No bookings found in the database.');
    }
    
    res.status(200).json(rows);
  });
});




// Endpoint to delete a test booking
app.delete('/test-bookings/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM test_bookings WHERE test_id = ?', id, function (err) {
    if (err) {
      console.error('Error deleting test booking:', err);
      return res.status(500).send('Failed to delete test booking');
    }
    db.run('DELETE FROM test_details WHERE booking_id = ?', id, function (err) {
      if (err) {
        console.error('Error deleting test details:', err);
        return res.status(500).send('Failed to delete test details');
      }
      res.status(200).send('Test booking deleted successfully');
    });
  });
});

app.post('/printed-tests', async (req, res) => {
  console.log('Received request body:', req.body);
  const { tests } = req.body;

  if (!tests || !Array.isArray(tests) || tests.length === 0) {
    return res.status(400).send('No tests provided');
  }

  const printedTestQuery = `
    INSERT INTO printed_tests (
      patient_id, lab_no, name, sex, age, age_unit, time, specimen, 
      referred_by, date, investigation, rate, price_naira, 
      reference_range, interpretation, remark
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  try {
    const insertedTests = []; // Store inserted tests

    for (const test of tests) {
      const { patient_id, lab_no, name, sex, age, age_unit, time, specimen, referredBy, date, investigation, rate, price_naira, reference_range, interpretation, remark } = test;

      const values = [patient_id, lab_no, name, sex, age, age_unit, time, specimen, referredBy, date, investigation, rate, price_naira, reference_range, interpretation, remark].map(value => value ?? null);

      await new Promise((resolve, reject) => {
        db.run(printedTestQuery, values, function (err) {
          if (err) {
            console.error('Error saving printed test:', err);
            return reject(err);
          }
          insertedTests.push({ id: this.lastID, ...test }); // Store each inserted test with its ID
          resolve();
        });
      });
    }

    res.status(201).json(insertedTests); // Send inserted tests back to frontend

  } catch (error) {
    console.error('Error saving printed test:', error);
    res.status(500).send('Failed to save printed test');
  }
});



// Retrieve all printed tests
app.get('/masters', (req, res) => {
  db.all('SELECT * FROM printed_tests', [], (err, rows) => {
    if (err) {
      console.error('Error retrieving printed tests:', err);
      res.status(500).send('Error retrieving printed tests');
      return;
    }
    console.log("Retrieved data:", rows); // Log retrieved data
    res.status(200).json(rows);
  });
});

app.get('/printed-tests-summary', (req, res) => {
  const queryMonthly = `
    SELECT 
      strftime('%Y-%m', date) as month, 
      SUM(price_naira) as total_price
    FROM 
      printed_tests
    GROUP BY 
      strftime('%Y-%m', date)
  `;

  const queryWeekly = `
    SELECT 
      strftime('%Y-%W', date) as week, 
      SUM(price_naira) as total_price
    FROM 
      printed_tests
    GROUP BY 
      strftime('%Y-%W', date)
  `;

  const queryGender = `
    SELECT 
      sex, 
      SUM(price_naira) as total_price
    FROM 
      printed_tests
    GROUP BY 
      sex
  `;

  db.serialize(() => {
    db.all(queryMonthly, [], (err, monthlyResults) => {
      if (err) {
        console.error('Error retrieving monthly summary:', err);
        return res.status(500).send('Failed to retrieve monthly summary');
      }

      db.all(queryWeekly, [], (err, weeklyResults) => {
        if (err) {
          console.error('Error retrieving weekly summary:', err);
          return res.status(500).send('Failed to retrieve weekly summary');
        }

        db.all(queryGender, [], (err, genderResults) => {
          if (err) {
            console.error('Error retrieving gender summary:', err);
            return res.status(500).send('Failed to retrieve gender summary');
          }

          res.status(200).json({
            monthly: monthlyResults,
            weekly: weeklyResults,
            gender: genderResults
          });
        });
      });
    });
  });
});

// API to handle form submission
app.post('/submit-contact-form', (req, res) => {
  const { name, email, phone, message, consent } = req.body;

  // Insert data into the database
  const query = `INSERT INTO contact_form (name, email, phone, message, consent) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [name, email, phone, message, consent ? 1 : 0], function (err) {
    if (err) {
      console.error('Error saving form submission:', err);
      return res.status(500).send('Failed to submit form');
    }

    // Send confirmation email
    const confirmationMessage = `Dear ${name},\n\nThank you for reaching out to us. We have received your message and will get back to you shortly.\n\nBest Regards,\nOsamedic Diagnostics`;
    sendEmail(email, 'Contact Form Submission Confirmation', confirmationMessage);

    // Send notification email to admin
    const adminMessage = `New contact form submission from ${name} (${email}, ${phone}):\n\nMessage:\n${message}`;
    sendEmail(process.env.ADMIN_EMAIL, 'New Contact Form Submission', adminMessage);

    res.status(201).send('Form submitted successfully');
  });
});

// API to retrieve contact information
app.get('/contact-info', (req, res) => {
  const contactInfo = {
    email: 'ailemendaniel76@gmail.com',
    location: 'Lagos, LA NG',
    hours: [
      { day: 'Monday', open: '9:00am', close: '10:00pm' },
      { day: 'Tuesday', open: '9:00am', close: '10:00pm' },
      { day: 'Wednesday', open: '9:00am', close: '10:00pm' },
      { day: 'Thursday', open: '9:00am', close: '10:00pm' },
      { day: 'Friday', open: '9:00am', close: '10:00pm' },
      { day: 'Saturday', open: '9:00am', close: '6:00pm' },
      { day: 'Sunday', open: '9:00am', close: '12:00pm' },
    ],
  };
  res.status(200).json(contactInfo);
});

// Starting the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});