const app = require('../server/src/app');

// Export for Vercel serverless
module.exports = (req, res) => {
  // Ensure environment variables are available
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ 
      message: 'Server configuration error: DATABASE_URL not set' 
    });
  }
  return app(req, res);
};
