// src/app.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');


const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const dataRoutes = require('./modules/data/data.routes');
const motorRoutes = require('./modules/motor/motor.routes');
const travelRoutes = require('./modules/travel/travel.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const claimRoutes = require('./modules/claim/claim.motor.routes');
const proposalsRoutes = require('./modules/proposals/proposals.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');

// Admin
const adminRoutes = require('./modules/admin/admin.routes');
const adminAuthRoutes = require('./modules/admin/auth/adminAuth.routes');

const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware } = require('./middleware/auth');

// notification crons
const { registerNotificationCrons } = require('./modules/notifications/notification.cron');

registerNotificationCrons();

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// project root = one level up from src
const projectRoot = path.join(__dirname, '..',  'uploads');
// const uploadsDir = path.join(projectRoot, 'uploads');

app.use('/uploads', express.static(projectRoot));

console.log('Static uploads dir for pictures:', projectRoot);

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Protected customer routes (example, you can apply per-route instead)
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/motor', authMiddleware, motorRoutes);
app.use('/api/travel', authMiddleware, travelRoutes);
app.use('/api/claims', authMiddleware, claimRoutes);
app.use('/api/proposals', authMiddleware, proposalsRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

//payment.routes.js already does requireAuth on initiate and webhook is no-auth.
app.use('/api/payment', authMiddleware, paymentRoutes);

// Admin routes (new)
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminRoutes);


// Shortcut route to open the API playground
app.get('/playground', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'playground.html'));
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
