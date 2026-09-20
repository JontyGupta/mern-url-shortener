const express = require('express');
const router = express.Router();
const Url = require('../models/Url');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 3600 });
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const recordAnalytics = () => {
            const ua = req.headers['user-agent'] || '';
            const isMobile = /Mobile|Android|iP(hone|od|ad)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua);
            const deviceType = isMobile ? 'mobile' : 'desktop';

            const rawReferrer = req.headers.referer || req.headers.referrer || '';
            let referrerDomain = 'Direct';
            if (rawReferrer) {
                try {
                    const urlObj = new URL(rawReferrer);
                    // Replace dots with underscores to prevent MongoDB key errors
                    referrerDomain = urlObj.hostname.replace('www.', '').replace(/\./g, '_'); 
                } catch (e) {
                    referrerDomain = 'Direct';
                }
            }

            Url.updateOne(
                { urlCode: code },
                {
                    $inc: {
                        clicks: 1,
                        [`analytics.${deviceType}`]: 1,
                        [`analytics.referrers.${referrerDomain}`]: 1
                    }
                }
            ).catch(err => console.error('Analytics error:', err));
        };

        // Check Cache
        const cachedData = cache.get(code);
        if (cachedData) {
            recordAnalytics(); // <-- RECORD ANALYTICS FIRST
            
            if (cachedData.hasPassword) {
                return res.redirect(`${FRONTEND_URL}/unlock/${code}`);
            }
            return res.redirect(cachedData.longUrl);
        }

        // Cache Miss: Database Lookup
        const url = await Url.findOne({ urlCode: code });

        if (url) {
            cache.set(code, { longUrl: url.longUrl, hasPassword: !!url.password });
            
            recordAnalytics(); // <-- RECORD ANALYTICS FIRST
            
            if (url.password) {
                return res.redirect(`${FRONTEND_URL}/unlock/${code}`);
            }
            return res.redirect(url.longUrl);
        } else {
            return res.status(404).json({ msg: 'No URL found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;