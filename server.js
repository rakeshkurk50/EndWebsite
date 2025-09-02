const express = require('express');
const mongoose = require('mongoose');
// bodyParser replaced by built-in express.json()
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://rakesh_db:hellouser1234A@cluster0.6yqatas.mongodb.net/user_registration_app?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Log mongoose connection events for better diagnostics
mongoose.connection.on('connected', () => console.log('Mongoose connected')); 
mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err));
mongoose.connection.on('disconnected', () => console.log('Mongoose disconnected'));
mongoose.connection.on('reconnected', () => console.log('Mongoose reconnected'));

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    mobile: { type: String, required: true, match: [/^\d{10}$/, 'Mobile must be 10 digits'] },
    email: { type: String, required: true, unique: true },
    address: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

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
    const state = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    res.json({ ok: true, mongoReadyState: state, env: process.env.NODE_ENV || 'undefined' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Global error handler (returns JSON)
app.use((err, req, res, next) => {
    console.error('Unhandled error middleware caught:', err);
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
