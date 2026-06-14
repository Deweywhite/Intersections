const fs = require('fs');
const path = require('path');

// Cache pairs in memory after first load
let cachedPairs = null;

function loadPairs() {
    if (!cachedPairs) {
        const filePath = path.join(__dirname, '..', '_private', 'related_five_letter_word_pairs.json');
        cachedPairs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return cachedPairs;
}

function getEasternDate() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    // Returns "YYYY-MM-DD" format
}

function findIntersection(h, v) {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if (h[i] === v[j]) {
                return { intersectH: i, intersectV: j };
            }
        }
    }
    return null;
}

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const pairs = loadPairs();
    const mode = (req.query.mode || 'daily').toLowerCase();

    if (mode === 'random') {
        // Random mode: pick any pair with a valid intersection
        let found = false;
        let attempts = 0;
        while (!found && attempts < 1000) {
            attempts++;
            const entry = pairs[Math.floor(Math.random() * pairs.length)];
            const h = entry.words[0].toUpperCase();
            const v = entry.words[1].toUpperCase();
            if (h.length !== 5 || v.length !== 5) continue;

            const intersection = findIntersection(h, v);
            if (intersection) {
                return res.status(200).json({
                    targetHorizontal: h,
                    targetVertical: v,
                    intersectH: intersection.intersectH,
                    intersectV: intersection.intersectV,
                    date: null,
                    mode: 'random'
                });
            }
        }
        return res.status(500).json({ error: 'Could not find a valid pair' });
    }

    // Daily mode (default): find pair for a specific date
    const date = req.query.date || getEasternDate();
    const entry = pairs.find(p => p.date === date);

    if (!entry) {
        // No dated puzzle — fall back to a random pair
        let attempts = 0;
        while (attempts < 1000) {
            attempts++;
            const fallback = pairs[Math.floor(Math.random() * pairs.length)];
            const fh = fallback.words[0].toUpperCase();
            const fv = fallback.words[1].toUpperCase();
            if (fh.length !== 5 || fv.length !== 5) continue;
            const fi = findIntersection(fh, fv);
            if (fi) {
                return res.status(200).json({
                    targetHorizontal: fh,
                    targetVertical: fv,
                    intersectH: fi.intersectH,
                    intersectV: fi.intersectV,
                    date: null,
                    mode: 'random'
                });
            }
        }
        return res.status(500).json({ error: 'Could not find a valid pair' });
    }

    const h = entry.words[0].toUpperCase();
    const v = entry.words[1].toUpperCase();
    const intersection = findIntersection(h, v);

    if (!intersection) {
        return res.status(500).json({ error: 'Puzzle pair has no shared letter', date });
    }

    res.status(200).json({
        targetHorizontal: h,
        targetVertical: v,
        intersectH: intersection.intersectH,
        intersectV: intersection.intersectV,
        date: date,
        mode: 'daily'
    });
};
