const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

/* ================= CORS ================= */

app.use(cors({
  origin: [
    'http://localhost:5173', // Vite frontend
    'http://localhost:3000', // React frontend
    'https://jadhavarparamedicalcollege.com', // Production frontend
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

/* ================= BODY PARSER ================= */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILES ================= */

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

/* ================= ROUTES ================= */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/careers', require('./routes/career'));
app.use('/api/blogs', require('./routes/blog'));

/* ================= HEALTH CHECK ================= */

app.get('/', (req, res) => {
  res.json({
    status: "OK",
    message: "Backend running 🚀"
  });
});

/* ================= PING ROUTE ================= */

app.get('/ping', (req, res) => {
  res.send('✅ Server is alive');
});

/* ================= HOSTINGER STATUS API ================= */
/* This helps you verify backend is running on Hostinger */

app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    server: "Hostinger Backend",
    status: "Running ✅",
    timestamp: new Date(),
    uptime: process.uptime() // seconds
  });
});

/* ================= ERROR HANDLER ================= */

app.use((err, req, res, next) => {
  console.error(err.message);

  res.status(500).json({
    success: false,
    message: err.message
  });
});

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5003;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
