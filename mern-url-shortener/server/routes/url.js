const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const Url = require('../models/Url');
const { verifyToken, requireAuth } = require('../middleware/auth');

// Helper to auto-categorize based on page metadata (No AI Key needed)
const extractCategory = async (targetUrl) => {
    try {
        const { data } = await axios.get(targetUrl, { timeout: 3000 });
        const $ = cheerio.load(data);
        const text = ($('title').text() + " " + $('meta[name="description"]').attr('content')).toLowerCase();
        
        if (text.match(/code|tech|software|developer|programming/)) return 'Technology';
        if (text.match(/movie|music|video|game|entertainment/)) return 'Entertainment';
        if (text.match(/news|breaking|daily/)) return 'News';
        if (text.match(/shop|buy|price|store/)) return 'Shopping';
        return 'General';
    } catch (e) {
        return 'General';
    }
};

// Create Short URL
router.post('/shorten', verifyToken, async (req, res) => {
    const { longUrl, customLength, customAlias } = req.body;
    const baseUrl = process.env.BASE_URL;

    // Check if custom alias is provided, else generate code
    let urlCode = customAlias;
    if (!urlCode) {
        if (customLength) {
            // Generate custom length random string
            urlCode = crypto.randomBytes(Math.ceil(customLength / 2)).toString('hex').slice(0, customLength);
        } else {
            urlCode = shortid.generate();
        }
    }

    try {
        // Ensure alias isn't taken
        let existingUrl = await Url.findOne({ urlCode });
        if (existingUrl) return res.status(400).json({ msg: 'Alias or Code already in use' });

        const category = await extractCategory(longUrl);
        const shortUrl = `${baseUrl}/${urlCode}`;
        
        const urlData = {
            longUrl,
            shortUrl,
            urlCode,
            category,
            user: req.user ? req.user.id : null,
        };

        // If anonymous user, delete after 24 hours
        if (!req.user) {
            urlData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
        }

        const url = new Url(urlData);
        await url.save();
        res.json(url);
    } catch (err) {
        res.status(500).json({ msg: 'Server Error' });
    }
});

// Get User's URLs (Dashboard)
router.get('/my-urls', verifyToken, requireAuth, async (req, res) => {
    try {
        const urls = await Url.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(urls);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Admin Route: Get all URLs
router.get('/all-urls', verifyToken, requireAuth, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    try {
        const urls = await Url.find().sort({ createdAt: -1 });
        res.json(urls);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// Delete URL
router.delete('/:id', verifyToken, requireAuth, async (req, res) => {
    try {
        const url = await Url.findById(req.params.id);
        
        if (!url) {
            return res.status(404).json({ msg: 'URL not found' });
        }

        // Ensure the logged-in user owns this URL (or is an admin)
        if (url.user.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await url.deleteOne();
        res.json({ msg: 'URL removed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;    