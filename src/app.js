// src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const dataRoutes = require('./modules/data/data.routes');
const motorRoutes = require('./modules/motor/motor.routes');
const travelRoutes = require('./modules/travel/travel.routes');
const paymentRoutes = require('./modules/payment/payment.routes');
const policyRoutes = require('./modules/policy/policy.routes');
const claimRoutes = require('./modules/claim/claim.routes');

const adminRoutes = require('./modules/admin/admin.routes');
const { errorHandler } = require('./middleware/errorHandler');
const { authMiddleware, adminMiddleware } = require('./middleware/auth');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Protected customer routes (example, you can apply per-route instead)
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/motor', authMiddleware, motorRoutes);
app.use('/api/travel', authMiddleware, travelRoutes);
app.use('/api/payment', authMiddleware, paymentRoutes);
app.use('/api/policies', authMiddleware, policyRoutes);
app.use('/api/claims', authMiddleware, claimRoutes);

// Admin routes (auth + admin)
app.use(
  '/api/admin',
  authMiddleware,
  adminMiddleware,
  adminRoutes
);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

module.exports = app;
