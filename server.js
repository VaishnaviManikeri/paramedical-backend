const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const path = require('path');
const multer = require('multer'); // ✅ REQUIRED

// Load environment variables
dotenv.config();

// Connect MongoDB
connectDB();

const app = express();

/* ======================================================
   MIDDLEWARE
====================================================== */

// CORS configuration
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// ❌ REMOVE THIS (BREAKS EXPRESS 5)
// app.options('*', cors());

// Body parsing
app.use(express.json({
    limit: '50mb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '50mb',
    parameterLimit: 1000000
}));

// Request logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* ======================================================
   ROUTES
====================================================== */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/careers', require('./routes/career'));
app.use('/api/blogs', require('./routes/blog'));

/* ======================================================
   HEALTH CHECK
====================================================== */

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is running successfully 🚀',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'paramedical-api',
        timestamp: new Date().toISOString()
    });
});

/* ======================================================
   404 HANDLER (FIXED)
====================================================== */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */

app.use((err, req, res, next) => {
    console.error('🚨 ERROR:', err.message);

    // Multer errors
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: err.code === 'LIMIT_FILE_SIZE'
                ? 'File too large. Max 5MB'
                : err.message
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: Object.values(err.errors).map(e => e.message)
        });
    }

    // Duplicate key
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate value detected'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

/* ======================================================
   START SERVER
====================================================== */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log('====================================');
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('====================================');
});

// Unhandled promise rejection
process.on('unhandledRejection', (err) => {
    console.error('🚨 UNHANDLED REJECTION:', err.message);
    server.close(() => process.exit(1));
});

// Uncaught exception
process.on('uncaughtException', (err) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', err.message);
    process.exit(1);
});

module.exports = app;
