const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect MongoDB
connectDB();

const app = express();

// ====================== MIDDLEWARE ======================
app.use(cors({
    origin: '*', // you can restrict later to frontend domain
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====================== ROUTES ======================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/announcements', require('./routes/announcement'));
app.use('/api/careers', require('./routes/career'));

// ====================== HEALTH CHECK (RENDER) ======================
app.get('/', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is running successfully 🚀'
    });
});

// ====================== ERROR HANDLER ======================
app.use((err, req, res, next) => {
    console.error('ERROR:', err.message);

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});
