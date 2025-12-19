// src/modules/travel/travel.destination.controller.js
const {
    getTravelDestinationsService,
} = require('./travel.destination.service');

async function getTravelDestinations(req, res, next) {
    try {
        const { region, search } = req.query;

        const destinations = await getTravelDestinationsService({
            region,
            search,
        });

        return res.json({
            success: true,
            data: destinations,
        });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getTravelDestinations,
};
