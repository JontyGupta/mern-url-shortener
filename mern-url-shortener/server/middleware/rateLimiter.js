const rateLimit = require('express-rate-limit');

// Strict limiter for creating URLs to prevent spam
const createUrlLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 URL creations per windowMs
    message: { msg: 'Too many URLs created from this IP, please try again after 15 minutes.' },
    standardHeaders: true, 
    legacyHeaders: false,
});

// Stricter limiter for authentication to prevent brute-force attacks
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login/register requests per hour
    message: { msg: 'Too many authentication attempts, please try again later.' },
});

module.exports = { createUrlLimiter, authLimiter };