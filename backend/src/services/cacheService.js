const { safeRedis } = require('../config/redis');

const DOCTOR_TTL = parseInt(process.env.CACHE_DOCTOR_TTL || '600', 10); // 10 minutes
const SPEC_TTL = parseInt(process.env.CACHE_SPECIALIZATIONS_TTL || '1800', 10); // 30 minutes

class CacheService {
  /**
   * Get cached doctor profile by ID
   */
  async getDoctor(doctorId) {
    const key = `cache:doctor:${doctorId}`;
    const data = await safeRedis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache doctor profile
   */
  async setDoctor(doctorId, doctorData, ttl = DOCTOR_TTL) {
    const key = `cache:doctor:${doctorId}`;
    await safeRedis.set(key, JSON.stringify(doctorData), ttl);
  }

  /**
   * Invalidate doctor cache and any doctor lists
   */
  async invalidateDoctor(doctorId) {
    const key = `cache:doctor:${doctorId}`;
    await safeRedis.del(key);
    await safeRedis.delByPattern('cache:doctors:list:*');
  }

  /**
   * Get cached specializations list
   */
  async getSpecializations() {
    const key = 'cache:specializations:all';
    const data = await safeRedis.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Cache specializations list
   */
  async setSpecializations(specsData, ttl = SPEC_TTL) {
    const key = 'cache:specializations:all';
    await safeRedis.set(key, JSON.stringify(specsData), ttl);
  }

  /**
   * Invalidate specializations cache
   */
  async invalidateSpecializations() {
    const key = 'cache:specializations:all';
    await safeRedis.del(key);
    await safeRedis.delByPattern('cache:doctors:list:*');
  }

  /**
   * Clear all app caches
   */
  async clearAll() {
    await safeRedis.delByPattern('cache:*');
  }
}

module.exports = new CacheService();
