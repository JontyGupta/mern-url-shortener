const mongoose = require('mongoose');

const UrlSchema = new mongoose.Schema({
    urlCode:     { type: String, required: true, unique: true },
    longUrl:     { type: String, required: true },
    shortUrl:    { type: String, required: true },
    category:    { type: String, default: 'General' }, // Auto-categorized feature
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    clicks:      { type: Number, default: 0 },
    expiresAt:   { type: Date, default: null } 
}, { timestamps: true });

// TTL Index: MongoDB automatically deletes documents where expiresAt is reached
UrlSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Url', UrlSchema);