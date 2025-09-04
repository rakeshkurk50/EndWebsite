const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, match: [/^\d{10}$/, 'Mobile must be 10 digits'] },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    address: { type: String },
    street: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);


