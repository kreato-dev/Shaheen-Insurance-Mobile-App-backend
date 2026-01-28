// src/modules/data/data.routes.js
const express = require('express');
const router = express.Router();
const dataController = require('./admin.data.controller');
const requireAdmin = require('../../../middleware/requireAdmin.middleware');
const adminSession = require('../../../middleware/adminSession.middleware');
const requirePermission = require('../../../middleware/rbac.middleware');

// GET /api/data/cities
router.get('/cities', dataController.getCities);

// GET /api/data/countries
router.get('/countries', dataController.getCountries);

// GET /api/data/vehicle-makes
router.get('/vehicle-makes', dataController.getVehicleMakes);

// GET /api/data/vehicle-submakes/:makeId
router.get('/vehicle-submakes/:makeId', dataController.getVehicleSubmakes);

// GET /api/data/vehicle-body-types
router.get('/vehicle-body-types', dataController.getVehicleBodyTypes);

// GET /api/data/vehicle-variants?makeId=1&submakeId=5&modelYear=2021
router.get('/vehicle-variants', dataController.getVehicleVariants);

// GET /api/data/tracker-companies
router.get('/tracker-companies', dataController.getTrackerCompanies);

// GET /api/data/travel-destinations
// GET /api/data/travel-destinations?region=Europe
// GET /api/data/travel-destinations?search=United
router.get('/travel-destinations', dataController.getTravelDestinations);

/*
 * ADMIN C-U-D Routes
 */

const adminAuth = [requireAdmin, adminSession(), requirePermission('DATA:MANAGE')];

// --- Cities ---
router.post('/cities', adminAuth, dataController.createCity);
router.put('/cities/:id', adminAuth, dataController.updateCity);
router.delete('/cities/:id', adminAuth, dataController.deleteCity);

// --- Countries ---
// router.post('/countries', adminAuth, dataController.createCountry);
// router.put('/countries/:id', adminAuth, dataController.updateCountry);
// router.delete('/countries/:id', adminAuth, dataController.deleteCountry);

// --- Vehicle Makes ---
router.post('/vehicle-makes', adminAuth, dataController.createVehicleMake);
router.put('/vehicle-makes/:id', adminAuth, dataController.updateVehicleMake);
router.delete('/vehicle-makes/:id', adminAuth, dataController.deleteVehicleMake);

// --- Vehicle Submakes ---
router.post('/vehicle-submakes', adminAuth, dataController.createVehicleSubmake);
router.put('/vehicle-submakes/:id', adminAuth, dataController.updateVehicleSubmake);
router.delete('/vehicle-submakes/:id', adminAuth, dataController.deleteVehicleSubmake);

// --- Vehicle Variants ---
router.post('/vehicle-variants', adminAuth, dataController.createVehicleVariant);
router.put('/vehicle-variants/:id', adminAuth, dataController.updateVehicleVariant);
router.delete('/vehicle-variants/:id', adminAuth, dataController.deleteVehicleVariant);

// --- Vehicle Body Types ---
router.post('/vehicle-body-types', adminAuth, dataController.createVehicleBodyType);
router.put('/vehicle-body-types/:id', adminAuth, dataController.updateVehicleBodyType);
router.delete('/vehicle-body-types/:id', adminAuth, dataController.deleteVehicleBodyType);

// --- Tracker Companies ---
router.post('/tracker-companies', adminAuth, dataController.createTrackerCompany);
router.put('/tracker-companies/:id', adminAuth, dataController.updateTrackerCompany);
router.delete('/tracker-companies/:id', adminAuth, dataController.deleteTrackerCompany);

// --- Travel Destinations ---
// router.post('/travel-destinations', adminAuth, dataController.createTravelDestination);
// router.put('/travel-destinations/:id', adminAuth, dataController.updateTravelDestination);
// router.delete('/travel-destinations/:id', adminAuth, dataController.deleteTravelDestination);

module.exports = router;
