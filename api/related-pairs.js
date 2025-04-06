const relatedFiveLetterWordsPairs = require('../private/related_five_letter_words_pairs.json');

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(relatedFiveLetterWordsPairs);
}