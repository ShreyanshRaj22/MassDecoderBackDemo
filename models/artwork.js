const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
    image: { type: String, required: true },
    style: { type: String, required: true },
    artist: { type: String, required: true },
    category: { type: String, required: true },
    name: { type: String, required: true }
});

artworkSchema.index({ '$**': 'text' });

module.exports = mongoose.model('Artwork', artworkSchema);
