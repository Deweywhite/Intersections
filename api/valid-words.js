const validFiveLetterWords = require('../private/valid_five_letter_words.json');

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(validFiveLetterWords);
}