const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Check for optional auth (for anonymous URL creation)
    const token = req.header('Authorization');
    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

const requireAuth = (req, res, next) => {
    if (!req.user) return res.status(401).json({ msg: 'Authorization denied' });
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
};

module.exports = { verifyToken, requireAuth, requireAdmin };