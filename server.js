// Import required modules
const express = require('express');
const axios = require('axios'); // For IP geolocation API calls
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const tf = require('@tensorflow/tfjs'); // For TensorFlow.js ML model
const twilio = require('twilio'); // For SMS/Email
require('dotenv').config(); // To load environment variables

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Supabase setup
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Twilio setup
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Test Route
app.get('/', (req, res) => {
  res.send('Backend server is running properly!');
});

// Step 1: Geolocation API Route
app.post('/geolocation', async (req, res) => {
  try {
    const response = await axios.get(
      `http://api.ipstack.com/check?access_key=${process.env.IPSTACK_API_KEY}`
    );
    res.status(200).json({ location: response.data });
  } catch (error) {
    console.error('Error fetching geolocation:', error);
    res.status(500).json({ error: 'Failed to fetch geolocation' });
  }
});

// Step 2: Adaptive Login Route (with ML prediction)
app.post('/adaptive-login', async (req, res) => {
  try {
    const { userId, ip } = req.body;

    // Fetch user geolocation
    const geoResponse = await axios.get(
      `http://api.ipstack.com/${ip}?access_key=${process.env.IPSTACK_API_KEY}`
    );

    const { city, region_name, latitude, longitude } = geoResponse.data;

    // Example TensorFlow.js ML logic
    const model = await tf.loadLayersModel('file://model.json'); // Pre-trained model
    const prediction = model.predict(tf.tensor([latitude, longitude]));

    const decision = prediction > 0.5 ? 'Login Allowed' : 'Login Denied';

    res.status(200).json({
      location: { city, region_name, latitude, longitude },
      decision,
    });
  } catch (error) {
    console.error('Error during adaptive login:', error);
    res.status(500).json({ error: 'Failed to process adaptive login' });
  }
});

// Step 3: Send Notification via Twilio
app.post('/notify', async (req, res) => {
  try {
    const { to, message } = req.body;

    // Send SMS
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    res.status(200).json({ message: 'Notification sent', result });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});