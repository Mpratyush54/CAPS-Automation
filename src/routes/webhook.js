const express = require('express');
const router = express.Router();

router.post('/webhook', (req, res) => {
    res.json({ message: 'Webhook received' });
});

module.exports = router;
