const express = require('express');
const mongoose = require('mongoose');
const dotenv=require('dotenv');
dotenv.config();
// bodyParser replaced by built-in express.json()
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Connect using the reusable dbConnect utility which reads MONGO_URI from env
const dbConnect = require('./utils/dbConnect');
dbConnect().then(() => console.log('✅ Database connected')).catch(err => console.error('❌ Database connection failed:', err));

const User = require('./models/User');

// Ensure indexes (unique constraints) are created and log any index errors
User.init().then(() => console.log('User indexes ensured')).catch(err => console.error('User.init() error:', err));

app.post('/api/users', async (req, res) => {
    try {
        // If DB not connected, return 503
        if (mongoose.connection.readyState !== 1) {
            console.error('DB not connected, readyState=', mongoose.connection.readyState);
            return res.status(503).json({ error: 'Database not connected' });
        }
        // Sanitize and normalize input
        const input = Object.assign({}, req.body);
        if (input.mobile) input.mobile = String(input.mobile).replace(/\D/g, '');
        if (input.email) input.email = String(input.email).trim().toLowerCase();
        if (input.username) input.username = String(input.username).trim();
        // Validate required fields
        const required = ['firstName', 'lastName', 'mobile', 'email', 'username', 'password'];
        const missing = required.filter(k => !input[k] || String(input[k]).trim() === '');
        if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

        // Early validation for mobile to return a clear error
        if (!/^[0-9]{10}$/.test(input.mobile)) {
            // Debug logging: show sanitized value, length
            try {
                const val = input.mobile || '';
                console.error('Invalid mobile after sanitize:', JSON.stringify(val), 'len=', val.length);
            } catch (e) {
                console.error('Failed logging mobile debug', e);
            }
            return res.status(400).json({ error: 'Mobile must be 10 digits' });
        }

        // Basic email format check
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        // Log incoming (sanitized) payload for debugging (do not log password)
        const dbg = Object.assign({}, input);
        if (dbg.password) dbg.password = '***REDACTED***';
        console.log('Register payload:', JSON.stringify(dbg));

        const user = new User(input);
        await user.save();
        console.log('User saved:', user._id);
        res.status(201).json(user);
    } catch (err) {
        console.error('Error saving user:', err);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ error: messages.join(', ') });
        }
        if (err.code === 11000) {
            // Mongo duplicate key error
            const dupFields = [];
            if (err.keyValue) dupFields.push(...Object.keys(err.keyValue));
            const keyPattern = err.message && err.message.match(/index:\s+([\w\.]+)_\d+\s+dup key/);
            if (keyPattern && keyPattern[1]) dupFields.push(keyPattern[1]);
            const fields = dupFields.length ? dupFields.join(', ') : 'unknown';
            return res.status(400).json({ error: `Duplicate value for field(s): ${fields}` });
        }
        // Return error message for easier debugging; include stack when DEBUG=true
        const response = { error: err.message || 'Failed to save user' };
        if (process.env.DEBUG === 'true') response.stack = err.stack;
        res.status(500).json(response);
    }
});

app.get('/api/users', async (req, res) => {
	try {
		const users = await User.find().sort({ createdAt: -1 });
		res.json(users);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to fetch users' });
	}
});

// Health endpoint for deployment diagnostics
app.get('/health', (req, res) => {
    const state = mongoose.connection && mongoose.connection.readyState ? mongoose.connection.readyState : 0; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    res.json({ ok: true, mongoReadyState: state, env: process.env.NODE_ENV || 'undefined' });
});

// SPA fallback: serve index.html for non-API GET requests
app.get('*', (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/') || req.path === '/health') return next();
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler (returns JSON)
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack || err);
    const status = err.status || 500;
    const out = { error: err.message || 'Internal Server Error' };
    if (process.env.DEBUG === 'true') out.stack = err.stack;
    res.status(status).json(out);
});

// Handle unhandled promise rejections and uncaught exceptions (log and keep process alive if possible)
process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
