const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load env
dotenv.config();

// DB
connectDB();

const app = express();

/* ====================== ALLOWED ORIGINS ====================== */
const allowedOrigins = [
    'http://localhost:5173',     // Vite
    'http://localhost:3000',     // React
    'https://jadhavarparamedicalcollege.com' // Render frontend
];

/* ====================== CORS CONFIG ====================== */
app.use(cors({
    origin: function (origin, callback) {
        // Allow server-to-server & Postman
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS not allowed ❌'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

/* ====================== BODY PARSERS ====================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ====================== ROUTES ====================== */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/careers', require('./routes/career'));
app.use('/api/blogs', require('./routes/blog'));

/* ====================== HEALTH CHECK ====================== */
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Render backend running 🚀'
    });
});

/* ====================== ERROR HANDLER ====================== */
app.use((err, req, res, next) => {
    console.error('ERROR:', err.message);

    res.status(500).json({
        success: false,
        message: err.message
    });
});

/* ====================== SERVER ====================== */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
