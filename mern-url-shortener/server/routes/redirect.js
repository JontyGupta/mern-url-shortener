const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const NodeCache = require('node-cache');

// Initialize cache (stdTTL: 3600 seconds = 1 hour time-to-live)
const cache = new NodeCache({ stdTTL: 3600 });

router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;

        // 1. Determine Analytics Data from Request Headers
        const ua = req.headers['user-agent'] || '';
        const isMobile = /Mobile|Android|iP(hone|od|ad)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua);
        const deviceType = isMobile ? 'mobile' : 'desktop';

        const rawReferrer = req.headers.referer || req.headers.referrer || '';
        let referrerDomain = 'Direct';
        if (rawReferrer) {
            try {
                const urlObj = new URL(rawReferrer);
                referrerDomain = urlObj.hostname.replace('www.', '');
            } catch (e) {
                referrerDomain = 'Direct';
            }
        }

        // 2. Non-blocking Database Analytics Update 
        // Uses MongoDB's atomic $inc operator to update stats without reading the document first
        const recordAnalytics = () => {
            Url.updateOne(
                { urlCode: code },
                {
                    $inc: {
                        clicks: 1,
                        [`analytics.${deviceType}`]: 1,
                        [`analytics.referrers.${referrerDomain}`]: 1
                    }
                }
            ).catch(err => console.error('Analytics update failed:', err));
        };

        // 3. Check Cache Layer First
        const cachedUrl = cache.get(code);
        if (cachedUrl) {
            // Instant redirect (Zero database reads!)
            res.redirect(cachedUrl);
            // Fire and forget analytics update in the background
            recordAnalytics();
            return;
        }

        // 4. Cache Miss: Query Database
        const url = await Url.findOne({ urlCode: code });

        if (url) {
            // Store the long URL in memory cache for subsequent requests
            cache.set(code, url.longUrl);
            
            // Redirect user
            res.redirect(url.longUrl);
            
            // Fire and forget analytics update in the background
            recordAnalytics();
            return;
        } else {
            return res.status(404).json({ msg: 'No URL found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;