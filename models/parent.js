const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const ParentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    verifiedEmail: { type: Boolean, default: false },
    password: { type: String, required: true },
    verificationCode: { type: String, required: false }, 
    verificationCodeExpiration: { type: Date, required: false },
    childConnectionStrings: [{ type: String }],  // Array to hold multiple child connection strings
});

ParentSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
    next();
});

module.exports = mongoose.model('Parent', ParentSchema);
