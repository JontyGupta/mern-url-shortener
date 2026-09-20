const express = require('express');
const router = express.Router();
const Url = require('../models/Url');

router.get('/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ urlCode: req.params.code });

        if (url) {
            url.clicks++;
            await url.save();
            return res.redirect(url.longUrl);
        } else {
            return res.status(404).json({ msg: 'No URL found' });
        }
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;