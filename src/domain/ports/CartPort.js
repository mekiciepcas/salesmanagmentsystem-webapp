/**
 * CartPort contract
 * Runtime clients call this interface instead of raw fetch.
 */
class CartPort {
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async add(item) {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line class-methods-use-this
  async get() {
    throw new Error('Not implemented');
  }
}

module.exports = CartPort;
