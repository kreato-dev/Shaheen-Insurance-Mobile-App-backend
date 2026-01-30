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

const authCommon = [requireAdmin, adminSession(), requirePermission('DATA:MANAGE_COMMON')];
const authMotor = [requireAdmin, adminSession(), requirePermission('DATA:MANAGE_MOTOR')];

// --- Cities ---
router.post('/cities', authCommon, dataController.createCity);
router.put('/cities/:id', authCommon, dataController.updateCity);
router.delete('/cities/:id', authCommon, dataController.deleteCity);

// --- Countries ---
// router.post('/countries', authCommon, dataController.createCountry);
// router.put('/countries/:id', authCommon, dataController.updateCountry);
// router.delete('/countries/:id', authCommon, dataController.deleteCountry);

// --- Vehicle Makes ---
router.post('/vehicle-makes', authMotor, dataController.createVehicleMake);
router.put('/vehicle-makes/:id', authMotor, dataController.updateVehicleMake);
router.delete('/vehicle-makes/:id', authMotor, dataController.deleteVehicleMake);

// --- Vehicle Submakes ---
router.post('/vehicle-submakes', authMotor, dataController.createVehicleSubmake);
router.put('/vehicle-submakes/:id', authMotor, dataController.updateVehicleSubmake);
router.delete('/vehicle-submakes/:id', authMotor, dataController.deleteVehicleSubmake);

// --- Vehicle Variants ---
router.post('/vehicle-variants', authMotor, dataController.createVehicleVariant);
router.put('/vehicle-variants/:id', authMotor, dataController.updateVehicleVariant);
router.delete('/vehicle-variants/:id', authMotor, dataController.deleteVehicleVariant);

// --- Vehicle Body Types ---
router.post('/vehicle-body-types', authMotor, dataController.createVehicleBodyType);
router.put('/vehicle-body-types/:id', authMotor, dataController.updateVehicleBodyType);
router.delete('/vehicle-body-types/:id', authMotor, dataController.deleteVehicleBodyType);

// --- Tracker Companies ---
router.post('/tracker-companies', authMotor, dataController.createTrackerCompany);
router.put('/tracker-companies/:id', authMotor, dataController.updateTrackerCompany);
router.delete('/tracker-companies/:id', authMotor, dataController.deleteTrackerCompany);

// --- Travel Destinations ---
// router.post('/travel-destinations', authTravel, dataController.createTravelDestination);
// router.put('/travel-destinations/:id', authTravel, dataController.updateTravelDestination);
// router.delete('/travel-destinations/:id', authTravel, dataController.deleteTravelDestination);

module.exports = router;
