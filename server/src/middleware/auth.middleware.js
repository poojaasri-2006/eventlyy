const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || typeof decoded.id !== 'string' ||
        !['ORGANIZER', 'VENDOR'].includes(decoded.role)) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, isActive: true }
    });
    if (!user || !user.isActive || user.role !== decoded.role) {
      return res.status(401).json({ message: 'Account is unavailable. Please log in again.' });
    }

    req.user = { id: user.id, role: user.role };
    next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      console.error('[Authentication Error]', error);
      return res.status(500).json({ message: 'Unable to verify account status' });
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const requireOrganizer = (req, res, next) => {
  if (req.user?.role !== 'ORGANIZER') {
    return res.status(403).json({ message: 'Organizer access required' });
  }
  next();
};

const requireVendor = (req, res, next) => {
  if (req.user?.role !== 'VENDOR') {
    return res.status(403).json({ message: 'Vendor access required' });
  }
  next();
};

module.exports = {
  authMiddleware,
  requireOrganizer,
  requireVendor
};
