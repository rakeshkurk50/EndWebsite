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
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        try {
            const existing = await User.findOne({ email });
            if (existing) {
                return res.status(409).json({ error: 'User with this email already exists' });
            }

            const user = await User.create({ name, email });
            return res.status(201).json({ user });
        } catch (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Error creating user' });
        }
    }

    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
};


