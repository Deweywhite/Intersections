const fs = require('fs');
const path = require('path');

let validWordsSet = null;

function getValidWords() {
    if (!validWordsSet) {
        const filePath = path.join(__dirname, '..', '_private', 'valid_five_letter_words.json');
        const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        validWordsSet = new Set(words.map(w => w.toUpperCase()));
    }
    return validWordsSet;
}

module.exports = function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const word = (req.query.word || '').toUpperCase().trim();

    if (!word || word.length !== 5 || !/^[A-Z]{5}$/.test(word)) {
        return res.status(400).json({ valid: false });
    }

    const valid = getValidWords().has(word);
    res.status(200).json({ valid });
};
