const dbConnect = require('../utils/dbConnect');
const User = require('../models/User');

module.exports = async function handler(req, res) {
    try {
        await dbConnect();
    } catch (err) {
        console.error('DB connection error:', err);
        return res.status(500).json({ error: 'Database connection error' });
    }

    if (req.method === 'POST') {
        const input = Object.assign({}, req.body);

        // sanitize
        if (input.mobile) input.mobile = String(input.mobile).replace(/\D/g, '');
        if (input.email) input.email = String(input.email).trim().toLowerCase();
        if (input.username) input.username = String(input.username).trim();

        const required = ['firstName', 'lastName', 'mobile', 'email', 'username', 'password'];
        const missing = required.filter(k => !input[k] || String(input[k]).trim() === '');
        if (missing.length) return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });

        if (!/^[0-9]{10}$/.test(input.mobile)) return res.status(400).json({ error: 'Mobile must be 10 digits' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return res.status(400).json({ error: 'Invalid email address' });

        try {
            const existing = await User.findOne({ $or: [{ email: input.email }, { username: input.username }] });
            if (existing) return res.status(409).json({ error: 'User with this email or username already exists' });

            const user = await User.create(input);
            return res.status(201).json(user);
        } catch (err) {
            console.error('Error creating user:', err);
            if (err.name === 'ValidationError') {
                const messages = Object.values(err.errors).map(e => e.message);
                return res.status(400).json({ error: messages.join(', ') });
            }
            if (err.code === 11000) return res.status(400).json({ error: 'Duplicate key error' });
            return res.status(500).json({ error: 'Error creating user' });
        }
    }

    if (req.method === 'GET') {
        try {
            const users = await User.find().sort({ createdAt: -1 });
            return res.json(users);
        } catch (err) {
            console.error('Error fetching users:', err);
            return res.status(500).json({ error: 'Error fetching users' });
        }
    }

    res.setHeader('Allow', ['GET','POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};


