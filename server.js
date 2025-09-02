const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://rakesh_db:hellouser1234A@cluster0.6yqatas.mongodb.net/user_registration_app?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

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

app.post('/api/users', async (req, res) => {
    try {
        // Sanitize and normalize input
        const input = Object.assign({}, req.body);
        if (input.mobile) input.mobile = String(input.mobile).replace(/\D/g, '');
        if (input.email) input.email = String(input.email).trim().toLowerCase();
        if (input.username) input.username = String(input.username).trim();

        // Early validation for mobile to return a clear error
        if (!input.mobile || !/^\d{10}$/.test(input.mobile)) {
            // Debug logging: show sanitized value, length and char codes
            try {
                const val = input.mobile || '';
                console.error('Invalid mobile after sanitize:', JSON.stringify(val), 'len=', val.length, 'codes=', Array.from(val).map(c => c.charCodeAt(0)));
            } catch (e) {
                console.error('Failed logging mobile debug', e);
            }
            return res.status(400).json({ error: 'Mobile must be 10 digits' });
        }

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
        res.status(500).json({ error: 'Failed to save user' });
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
