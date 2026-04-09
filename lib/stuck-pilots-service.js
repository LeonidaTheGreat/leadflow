const {
  StuckPilotsService,
  createDefaultStuckPilotsService,
} = require('./services/StuckPilotsService');

async function checkAndAlertStuckPilots(options) {
  const service = createDefaultStuckPilotsService();
  return service.checkAndAlertStuckPilots(options);
}

module.exports = {
  StuckPilotsService,
  createDefaultStuckPilotsService,
  checkAndAlertStuckPilots,
};
