const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const eventsRoutes = require('./routes/events.routes');
const vendorsRoutes = require('./routes/vendors.routes');
const inquiriesRoutes = require('./routes/inquiries.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const vendorBookingsRoutes = require('./routes/vendorBookings.routes');
const shortlistRoutes = require('./routes/shortlist.routes');
const quotesRoutes = require('./routes/quotes.routes');
const messagesRoutes = require('./routes/messages.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const profileRoutes = require('./routes/profile.routes');
const vendorDashboardRoutes = require('./routes/vendorDashboard.routes');
const vendorServicesRoutes = require('./routes/vendorServices.routes');
const vendorPackagesRoutes = require('./routes/vendorPackages.routes');
const vendorAvailabilityRoutes = require('./routes/vendorAvailability.routes');
const vendorRequestsRoutes = require('./routes/vendorRequests.routes');
const reviewsRoutes = require('./routes/reviews.routes');

const path = require('path');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/vendor/bookings', vendorBookingsRoutes);
app.use('/api/shortlist', shortlistRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vendor-dashboard', vendorDashboardRoutes);
app.use('/api/vendor/services', vendorServicesRoutes);
app.use('/api/vendor/packages', vendorPackagesRoutes);
app.use('/api/vendor/availability', vendorAvailabilityRoutes);
app.use('/api/vendor/requests', vendorRequestsRoutes);
app.use('/api/reviews', reviewsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', (req, res) => {
  res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

module.exports = app;
