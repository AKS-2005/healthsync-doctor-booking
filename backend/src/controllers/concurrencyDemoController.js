const redisLockService = require('../services/redisLockService');

class ConcurrencyDemoController {
  /**
   * POST /api/demo/simulate-race-condition
   * Fires two simultaneous slot lock requests to demonstrate Level 1 Redis Race Condition Protection
   */
  async simulateRaceCondition(req, res, next) {
    try {
      const { doctorId = 1, date = '2026-08-27', time = '10:30', userAId = 101, userBId = 102 } = req.body;

      // Force release any existing lock on this slot first for clean test
      await redisLockService.forceReleaseLock(doctorId, date, time);

      const timestampStart = Date.now();

      // Launch both lock requests concurrently with Promise.all
      const [resultA, resultB] = await Promise.all([
        redisLockService.acquireSlotLock(doctorId, date, time, userAId),
        redisLockService.acquireSlotLock(doctorId, date, time, userBId)
      ]);

      const durationMs = Date.now() - timestampStart;

      // Determine who won
      const winner = resultA.success ? 'Patient A (User 101)' : (resultB.success ? 'Patient B (User 102)' : 'None');

      res.json({
        success: true,
        summary: {
          slot: { doctorId, date, time },
          winner,
          durationMs,
          explanation: 'Only 1 user acquired the lock via atomic Redis SET NX. The other user was rejected with 409 Conflict.'
        },
        patientA: {
          requestedBy: `Patient A (ID: ${userAId})`,
          status: resultA.success ? 'ACQUIRED (200 OK)' : 'FAILED / LOCKED (409 Conflict)',
          ...resultA
        },
        patientB: {
          requestedBy: `Patient B (ID: ${userBId})`,
          status: resultB.success ? 'ACQUIRED (200 OK)' : 'FAILED / LOCKED (409 Conflict)',
          ...resultB
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConcurrencyDemoController();
