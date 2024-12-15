const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Parent = require('../models/parent');
const Child = require('../models/Child');
const nodemailer = require('nodemailer');
const router = express.Router();

// Utility function to generate 5-digit random code for verification
const generateVerificationCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString(); // 5-digit number
};

// Utility function to generate JWT token
const generateToken = (parentId) => {
    return jwt.sign({ id: parentId }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Register Parent Route
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingParent = await Parent.findOne({ email });
        if (existingParent) return res.status(400).json({ message: 'Email already exists' });

        const newParent = new Parent({ name, email, password });

        // Generate a 5-digit verification code and set expiration time
        const verificationCode = generateVerificationCode();
        const codeExpiration = new Date();
        codeExpiration.setMinutes(codeExpiration.getMinutes() + 10); // Code expires in 10 minutes

        newParent.verificationCode = verificationCode;
        newParent.verificationCodeExpiration = codeExpiration;
        await newParent.save();

        // Send verification email with the 5-digit code
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Verify Your Email',
            text: `Your 5-digit verification code is: ${verificationCode}. It will expire in 10 minutes.`,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: 'Registration successful! Please check your email for a 5-digit code.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Verify Parent Email with 5-Digit Code Route
router.post('/verify-email', async (req, res) => {
    const { email, verificationCode } = req.body;

    try {
        const parent = await Parent.findOne({ email });
        if (!parent) return res.status(404).json({ message: 'Parent not found' });

        if (parent.verifiedEmail) return res.status(400).json({ message: 'Email already verified' });

        if (new Date() > parent.verificationCodeExpiration) {
            return res.status(400).json({ message: 'Verification code has expired' });
        }

        if (parent.verificationCode !== verificationCode) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        // Mark parent as verified
        parent.verifiedEmail = true;
        parent.verificationCode = null; // Clear the verification code
        parent.verificationCodeExpiration = null; // Clear the expiration time
        await parent.save();

        res.status(200).json({ message: 'Email verified successfully!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Parent Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const parent = await Parent.findOne({ email });
        if (!parent) return res.status(404).json({ message: 'Parent not found' });

        const isMatch = await bcrypt.compare(password, parent.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        if (!parent.verifiedEmail) return res.status(400).json({ message: 'Please verify your email first' });

        const token = generateToken(parent._id); // Generate JWT Token
        res.status(200).json({ message: 'Login successful', token });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Add Child Connection String to Parent Route
router.post('/add-child', async (req, res) => {
    const { email, connectionString } = req.body;

    try {
        const parent = await Parent.findOne({ email });
        if (!parent) return res.status(404).json({ message: 'Parent not found' });

        // Check if the child exists in the database using connection string
        const child = await Child.findOne({ connectionString });
        if (!child) return res.status(404).json({ message: 'Child not found with this connection string' });

        // Check if parent has verified email
        if (!parent.verifiedEmail) return res.status(400).json({ message: 'Please verify your email first' });

        // Check if the child is already linked to this parent
        if (parent.childConnectionStrings.includes(connectionString)) {
            return res.status(400).json({ message: 'This child connection is already added to your account' });
        }

        // Add the child connection string to the parent's record
        parent.childConnectionStrings.push(connectionString);
        await parent.save();

        res.status(200).json({ message: 'Child connection string added successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
