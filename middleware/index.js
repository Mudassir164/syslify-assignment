require('dotenv').config(); // Load environment variables

// Middleware to authenticate API key
const authenticateAPIKey = (req, res, next) => {
    const apiKey = req.header('x-api-key');

    // Check if API key is provided and matches the stored key
    if (!apiKey || apiKey !== process.env.API_KEY) {
        return res.status(403).json({ error: 'Forbidden: Invalid API key' });
    }

    // Proceed to the next middleware or route handler
    next();
};

module.exports = { authenticateAPIKey };
