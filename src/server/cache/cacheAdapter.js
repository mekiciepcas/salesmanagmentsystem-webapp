/**
 * Önbellek arayüzü: gerçek Redis yokken no-op.
 * ERP / sık okunan listeler için ileride redisImpl ile değiştirilebilir.
 */
module.exports = {
  async get() {
    return null;
  },
  async set() {},
  async del() {},
};
