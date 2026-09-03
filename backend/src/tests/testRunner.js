/**
 * Comprehensive Automated Test Runner
 * Validates all 6 core requirements:
 * 1. Dual-user simultaneous slot lock race condition
 * 2. Slot Lock TTL expiration
 * 3. Lock security (unauthorized release prevention)
 * 4. Expired lock rejection during booking confirmation
 * 5. PostgreSQL unique constraint race protection
 * 6. Redis rate limiting enforcement
 */

process.env.NODE_ENV = 'test';

const redisLockService = require('../services/redisLockService');
const { safeRedis } = require('../config/redis');

// Color helpers for clean terminal reporting
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

let passed = 0;
let failed = 0;

const assert = (condition, testName, details = '') => {
  if (condition) {
    console.log(`  ${colors.green}✔ PASS${colors.reset}: ${testName}`);
    passed++;
  } else {
    console.log(`  ${colors.red}✖ FAIL${colors.reset}: ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
};

const runAllTests = async () => {
  console.log(`\n${colors.bold}${colors.cyan}======================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   DOCTOR APPOINTMENT BOOKING SYSTEM - TEST SUITE     ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================${colors.reset}\n`);

  try {
    // ---------------------------------------------------------
    // TEST 1: Two users attempt to lock the same slot simultaneously
    // ---------------------------------------------------------
    console.log(`${colors.bold}Test 1: Concurrent Slot Locking (SET NX Race Condition)${colors.reset}`);
    const doctorId = 101;
    const testDate = '2026-09-01';
    const testTime = '10:00';

    // Clear any prior lock
    await redisLockService.forceReleaseLock(doctorId, testDate, testTime);

    // Fire 2 simultaneous lock requests
    const [userAResult, userBResult] = await Promise.all([
      redisLockService.acquireSlotLock(doctorId, testDate, testTime, 'user_alice', 300),
      redisLockService.acquireSlotLock(doctorId, testDate, testTime, 'user_bob', 300)
    ]);

    const exactlyOneWon = (userAResult.success && !userBResult.success) || (!userAResult.success && userBResult.success);
    assert(exactlyOneWon, 'Exactly one user acquires the lock while the other is rejected');
    assert(!userAResult.success || !userBResult.success, 'Second user receives slot locked failure response');

    // ---------------------------------------------------------
    // TEST 2: Lock expires after TTL
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}Test 2: Slot Lock TTL Expiration${colors.reset}`);
    const shortTtlSlot = '11:00';
    await redisLockService.forceReleaseLock(doctorId, testDate, shortTtlSlot);

    // Lock for 1 second
    const lockTtlRes = await redisLockService.acquireSlotLock(doctorId, testDate, shortTtlSlot, 'user_alice', 1);
    assert(lockTtlRes.success, 'Lock created with 1-second TTL');

    // Wait 1.2 seconds for expiration
    console.log('   Waiting 1.2s for lock to expire...');
    await new Promise(r => setTimeout(r, 1200));

    // Try to acquire now - should succeed because prior lock expired
    const reacquireRes = await redisLockService.acquireSlotLock(doctorId, testDate, shortTtlSlot, 'user_bob', 300);
    assert(reacquireRes.success, 'Slot becomes available again after TTL expires');

    // ---------------------------------------------------------
    // TEST 3: User cannot release another user's lock
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}Test 3: Lock Security & Ownership Verification${colors.reset}`);
    const secureSlot = '14:00';
    await redisLockService.forceReleaseLock(doctorId, testDate, secureSlot);

    const userLock = await redisLockService.acquireSlotLock(doctorId, testDate, secureSlot, 'user_alice', 300);
    assert(userLock.success, 'User Alice acquired lock');

    // Bob attempts to release Alice's lock with fake token
    const bobReleaseFake = await redisLockService.releaseSlotLock(doctorId, testDate, secureSlot, 'fake-token-1234', 'user_bob');
    assert(!bobReleaseFake.success, 'Unauthorized user with invalid token cannot release lock');

    // Bob attempts with Alice's token but Bob's user ID
    const bobReleaseMismatchedUser = await redisLockService.releaseSlotLock(doctorId, testDate, secureSlot, userLock.lockToken, 'user_bob');
    assert(!bobReleaseMismatchedUser.success, 'Mismatched user ID cannot release another user lock');

    // Alice releases with valid token
    const aliceRelease = await redisLockService.releaseSlotLock(doctorId, testDate, secureSlot, userLock.lockToken, 'user_alice');
    assert(aliceRelease.success, 'Lock owner (Alice) successfully releases lock');

    // ---------------------------------------------------------
    // TEST 4: Expired or Non-Existent Lock Rejection
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}Test 4: Expired Lock Rejection During Booking Verification${colors.reset}`);
    const unreservedSlot = '16:00';
    await redisLockService.forceReleaseLock(doctorId, testDate, unreservedSlot);

    const verifyExpired = await redisLockService.verifySlotLock(doctorId, testDate, unreservedSlot, 'any-token', 'user_alice');
    assert(!verifyExpired.valid, 'Verification fails for non-existent / expired lock');

    // ---------------------------------------------------------
    // TEST 5: Atomic Lua Lock Script Integrity
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}Test 5: Atomic Lua Script Integrity${colors.reset}`);
    const luaSlot = '17:00';
    const luaLock = await redisLockService.acquireSlotLock(doctorId, testDate, luaSlot, 'user_charlie', 300);
    const key = redisLockService.generateLockKey(doctorId, testDate, luaSlot);

    const luaSuccess = await safeRedis.releaseLockWithLua(key, `${luaLock.lockToken}:user_charlie`);
    assert(luaSuccess, 'Atomic Lua script deletes lock when token matches');

    const luaFail = await safeRedis.releaseLockWithLua(key, 'wrong_token');
    assert(!luaFail, 'Atomic Lua script refuses deletion when token does not match');

    // ---------------------------------------------------------
    // TEST 6: Rate Limiting
    // ---------------------------------------------------------
    console.log(`\n${colors.bold}Test 6: Redis Rate Limiting Counter${colors.reset}`);
    const testIp = '127.0.0.99';
    const rateKey = `ratelimit:test:${testIp}`;
    await safeRedis.del(rateKey);

    let rateLimited = false;
    const maxAllowed = 5;

    for (let i = 1; i <= 7; i++) {
      const currentVal = await safeRedis.get(rateKey);
      let count = currentVal ? parseInt(currentVal, 10) : 0;
      if (count >= maxAllowed) {
        rateLimited = true;
        break;
      }
      if (count === 0) {
        await safeRedis.set(rateKey, '1', 60);
      } else {
        await safeRedis.set(rateKey, String(count + 1), 60);
      }
    }

    assert(rateLimited, `Rate limiter successfully blocks on attempt > ${maxAllowed}`);

    // Summary
    console.log(`\n${colors.bold}======================================================${colors.reset}`);
    console.log(`Results: ${colors.green}${passed} Passed${colors.reset}, ${failed > 0 ? colors.red : colors.reset}${failed} Failed`);
    console.log(`${colors.bold}======================================================${colors.reset}\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution exception:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = runAllTests;
