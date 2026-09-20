const express = require('express');
const router = express.Router();
const Url = require('../models/Url');

router.get('/:code', async (req, res) => {
    try {
        const url = await Url.findOne({ urlCode: req.params.code });

        if (url) {
            // 1. Detect Device via User-Agent
            const ua = req.headers['user-agent'] || '';
            const isMobile = /Mobile|Android|iP(hone|od|ad)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua);
            const deviceType = isMobile ? 'mobile' : 'desktop';

            // 2. Parse Referrer via Headers
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

            // 3. Increment Counters
            url.clicks++;
            url.analytics[deviceType]++;
            
            // Map handling for referrers
            const currentReferrerCount = url.analytics.referrers.get(referrerDomain) || 0;
            url.analytics.referrers.set(referrerDomain, currentReferrerCount + 1);

            await url.save();
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