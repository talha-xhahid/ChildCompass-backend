const express = require('express');
const Child = require('../models/Child');

const router = express.Router();

// Register Child
router.post('/register', async (req, res) => {
    const { name, age, gender } = req.body;

    try {
        const newChild = new Child({ name, age, gender });
        await newChild.save();

        // Include the auto-generated connection string in the response
        res.status(201).json({
            message: 'Child registered successfully',
            child: {
                id: newChild._id,
                name: newChild.name,
                age: newChild.age,
                gender: newChild.gender,
                connectionString: newChild.connectionString,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
