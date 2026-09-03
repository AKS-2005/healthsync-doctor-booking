const { v4: uuidv4 } = require('uuid');
const { safeRedis } = require('../config/redis');

const DEFAULT_TTL = parseInt(process.env.SLOT_LOCK_TTL || '300', 10); // 5 minutes (300 seconds)

class RedisLockService {
  /**
   * Generates a standard Redis key for an appointment slot.
   * Format: appointment_lock:doctor_<doctorId>:<YYYY-MM-DD>:<HH:MM>
   */
  generateLockKey(doctorId, date, time) {
    // Normalize time to HH:MM (e.g. "09:00:00" -> "09:00")
    const normalizedTime = time.substring(0, 5);
    return `appointment_lock:doctor_${doctorId}:${date}:${normalizedTime}`;
  }

  /**
   * Atomically acquires a 5-minute lock on an appointment slot using Redis SET NX EX.
   * Lock value stores: `<uuid_token>:<userId>`
   * 
   * @param {number|string} doctorId 
   * @param {string} date (YYYY-MM-DD)
   * @param {string} time (HH:MM)
   * @param {number|string} userId 
   * @param {number} ttlSeconds 
   * @returns {Promise<{success: boolean, lockToken?: string, expiresIn?: number, key: string, message?: string}>}
   */
  async acquireSlotLock(doctorId, date, time, userId, ttlSeconds = DEFAULT_TTL) {
    const key = this.generateLockKey(doctorId, date, time);
    const lockToken = uuidv4();
    const lockValue = `${lockToken}:${userId}`;

    // Redis SET key value NX EX ttl (Atomic)
    const acquired = await safeRedis.setNxEx(key, lockValue, ttlSeconds);

    if (acquired) {
      return {
        success: true,
        lockToken,
        expiresIn: ttlSeconds,
        key,
        message: 'Slot successfully locked for 5 minutes.'
      };
    }

    // If not acquired, check who has it and how much TTL remains
    const ttl = await safeRedis.ttl(key);
    return {
      success: false,
      expiresIn: ttl > 0 ? ttl : 0,
      key,
      message: 'This appointment slot is currently being held by another patient. Please select another slot.'
    };
  }

  /**
   * Verifies if a slot lock is still valid and belongs to the given user / lock token.
   * 
   * @param {number|string} doctorId 
   * @param {string} date 
   * @param {string} time 
   * @param {string} lockToken 
   * @param {number|string} [userId]
   * @returns {Promise<{valid: boolean, ttl: number, key: string, message?: string}>}
   */
  async verifySlotLock(doctorId, date, time, lockToken, userId = null) {
    const key = this.generateLockKey(doctorId, date, time);
    const storedValue = await safeRedis.get(key);

    if (!storedValue) {
      return {
        valid: false,
        ttl: 0,
        key,
        message: 'Your slot reservation has expired or does not exist. Please select the slot again.'
      };
    }

    const [storedToken, storedUserId] = storedValue.split(':');

    if (storedToken !== lockToken) {
      return {
        valid: false,
        ttl: 0,
        key,
        message: 'Invalid lock token. You do not have permission to modify this lock.'
      };
    }

    if (userId && storedUserId && String(storedUserId) !== String(userId)) {
      return {
        valid: false,
        ttl: 0,
        key,
        message: 'This slot lock belongs to another user.'
      };
    }

    const ttl = await safeRedis.ttl(key);

    return {
      valid: true,
      ttl: ttl > 0 ? ttl : 0,
      key,
      message: 'Lock is valid and active.'
    };
  }

  /**
   * Atomically releases a slot lock using a Lua script to prevent releasing another user's lock.
   * 
   * @param {number|string} doctorId 
   * @param {string} date 
   * @param {string} time 
   * @param {string} lockToken 
   * @param {number|string} [userId]
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async releaseSlotLock(doctorId, date, time, lockToken, userId = null) {
    const key = this.generateLockKey(doctorId, date, time);
    const storedValue = await safeRedis.get(key);

    if (!storedValue) {
      return {
        success: true, // Already expired/cleared
        message: 'Slot lock is already released or expired.'
      };
    }

    // Verify token matches before deleting
    const [storedToken, storedUserId] = storedValue.split(':');

    if (storedToken !== lockToken) {
      return {
        success: false,
        message: 'Unauthorized: Cannot release a lock that was not acquired by you.'
      };
    }

    if (userId && storedUserId && String(storedUserId) !== String(userId)) {
      return {
        success: false,
        message: 'Unauthorized: User ID mismatch.'
      };
    }

    // Execute atomic release with the full stored value
    const released = await safeRedis.releaseLockWithLua(key, storedValue);

    return {
      success: released,
      message: released ? 'Slot lock released successfully.' : 'Failed to release slot lock.'
    };
  }

  /**
   * Force remove a lock (Admin / post-confirmation cleanup)
   */
  async forceReleaseLock(doctorId, date, time) {
    const key = this.generateLockKey(doctorId, date, time);
    await safeRedis.del(key);
    return { success: true };
  }

  /**
   * Returns information about a specific slot's lock state.
   */
  async getSlotLockInfo(doctorId, date, time, currentUserId = null) {
    const key = this.generateLockKey(doctorId, date, time);
    const storedValue = await safeRedis.get(key);

    if (!storedValue) {
      return { isLocked: false, remainingTtl: 0, isMine: false };
    }

    const [storedToken, storedUserId] = storedValue.split(':');
    const ttl = await safeRedis.ttl(key);
    const isMine = Boolean(currentUserId && storedUserId && String(storedUserId) === String(currentUserId));

    return {
      isLocked: true,
      remainingTtl: ttl > 0 ? ttl : 0,
      isMine,
      lockToken: isMine ? storedToken : null // Don't expose token to others
    };
  }
}

module.exports = new RedisLockService();
