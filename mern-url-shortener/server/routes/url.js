const express = require('express');
const router = express.Router();
const shortid = require('shortid');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const bcrypt = require('bcryptjs');
const Url = require('../models/Url');
const { verifyToken, requireAuth } = require('../middleware/auth');
const { createUrlLimiter } = require('../middleware/rateLimiter');

const isValidHttpUrl = (value) => {
    try {
        const parsedUrl = new URL(value);
        return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && Boolean(parsedUrl.hostname);
    } catch (e) {
        return false;
    }
};

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
router.post('/shorten', verifyToken, createUrlLimiter, async (req, res) => {
    // 1. Destructure password from req.body
    const { longUrl, customLength, customAlias, expiresAt, password } = req.body;

    if (!isValidHttpUrl(longUrl)) {
        return res.status(400).json({ msg: 'Please enter a valid URL starting with http:// or https://' });
    }

    const baseUrl = process.env.BASE_URL;

    let urlCode = customAlias;
    if (!urlCode) {
        if (customLength) {
            urlCode = crypto.randomBytes(Math.ceil(customLength / 2)).toString('hex').slice(0, customLength);
        } else {
            urlCode = shortid.generate();
        }
    }

    try {
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

        // Date Logic: 24h for guests, Custom for logged-in users
        if (!req.user) {
            urlData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
        } else if (expiresAt) {
            urlData.expiresAt = new Date(expiresAt);
        }

        // 2. Hash and store password if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            urlData.password = await bcrypt.hash(password, salt);
        }

        const url = new Url(urlData);
        await url.save();
        res.json(url);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// Bulk Shorten URLs
router.post('/shorten-bulk', verifyToken, createUrlLimiter, async (req, res) => {
    // 1. Destructure password from req.body
    const { urls, expiresAt, password } = req.body;
    
    if (!Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ msg: 'Please provide an array of URLs' });
    }
    if (urls.length > 10) {
        return res.status(400).json({ msg: 'Bulk shortening is limited to 10 URLs per request' });
    }

    const invalidUrl = urls.find((longUrl) => !isValidHttpUrl(longUrl));
    if (invalidUrl) {
        return res.status(400).json({ msg: `Invalid URL: ${invalidUrl}` });
    }

    const baseUrl = process.env.BASE_URL;

    try {
        // 2. Hash password once for the entire batch if provided
        let hashedPassword = null;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        }

        const urlPromises = urls.map(async (longUrl) => {
            const urlCode = shortid.generate();
            const category = await extractCategory(longUrl);
            const shortUrl = `${baseUrl}/${urlCode}`;
            
            const urlData = {
                longUrl,
                shortUrl,
                urlCode,
                category,
                user: req.user ? req.user.id : null,
                password: hashedPassword // 3. Assign hashed password
            };

            // Date Logic: 24h for guests, Custom for logged-in users
            if (!req.user) {
                urlData.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 
            } else if (expiresAt) {
                urlData.expiresAt = new Date(expiresAt);
            }
            
            return urlData;
        });

        const resolvedUrls = await Promise.all(urlPromises);
        const savedUrls = await Url.insertMany(resolvedUrls);
        
        res.json(savedUrls);
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error during bulk processing' });
    }
});

// Unlock Protected URL (NEW ROUTE)
router.post('/unlock/:code', async (req, res) => {
    const { password } = req.body;
    try {
        const url = await Url.findOne({ urlCode: req.params.code });
        
        // Ensure URL exists and actually has a password
        if (!url || !url.password) {
            return res.status(404).json({ msg: 'URL not found or not protected' });
        }

        // Compare submitted password with hashed password
        const isMatch = await bcrypt.compare(password, url.password);
        if (!isMatch) {
            return res.status(401).json({ msg: 'Incorrect Password' });
        }

        // Manually increment clicks since we bypassed the standard cache redirect
        url.clicks++;
        await url.save();
        
        res.json({ longUrl: url.longUrl });
    } catch (err) {
        console.error(err);
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