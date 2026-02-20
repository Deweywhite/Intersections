module.exports = function handler(req, res) {
    res.status(403).json({ error: 'Forbidden' });
};
