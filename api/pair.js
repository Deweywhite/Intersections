const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const filePath = path.join(__dirname, '..', '_private', 'related_five_letter_word_pairs.json');
    const pairs = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Pick a random pair that has a shared letter (intersection)
    let targetHorizontal, targetVertical, intersectH, intersectV;
    let found = false;

    while (!found) {
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const h = pair[0].toUpperCase();
        const v = pair[1].toUpperCase();
        if (h.length !== 5 || v.length !== 5) continue;

        for (let i = 0; i < 5 && !found; i++) {
            for (let j = 0; j < 5 && !found; j++) {
                if (h[i] === v[j]) {
                    targetHorizontal = h;
                    targetVertical = v;
                    intersectH = i;
                    intersectV = j;
                    found = true;
                }
            }
        }
    }

    res.status(200).json({ targetHorizontal, targetVertical, intersectH, intersectV });
};
