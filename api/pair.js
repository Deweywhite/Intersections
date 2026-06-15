const fs = require('fs');
const path = require('path');

let cachedPairs = null;

function loadPairs() {
    if (!cachedPairs) {
        const filePath = path.join(__dirname, '..', '_private', 'scheduled_pairs.json');
        cachedPairs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return cachedPairs;
}

function getEasternDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function entryToResponse(entry, mode, date) {
    return {
        targetHorizontal: entry.words[0].toUpperCase(),
        targetVertical:   entry.words[1].toUpperCase(),
        intersectH:       entry.intersectH,
        intersectV:       entry.intersectV,
        clues:            entry.clues || [],
        date:             date,
        mode:             mode
    };
}

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const pairs = loadPairs();
    const mode  = (req.query.mode || 'daily').toLowerCase();

    if (mode === 'random') {
        const entry = pairs[Math.floor(Math.random() * pairs.length)];
        return res.status(200).json(entryToResponse(entry, 'random', null));
    }

    // Daily mode: find today's puzzle
    const date  = req.query.date || getEasternDate();
    const entry = pairs.find(p => p.date === date);

    if (!entry) {
        // No puzzle for this date — fall back to random
        const fallback = pairs[Math.floor(Math.random() * pairs.length)];
        return res.status(200).json(entryToResponse(fallback, 'random', null));
    }

    return res.status(200).json(entryToResponse(entry, 'daily', date));
};
