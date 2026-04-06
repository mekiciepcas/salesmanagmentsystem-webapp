/**
 * AuthPort contract
 * Implementations should provide authenticate and registration key validation.
 */
class AuthPort {
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async authenticate(username, password) {
    throw new Error('Not implemented');
  }

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async validateRegistrationKey(registrationKey) {
    throw new Error('Not implemented');
  }
}

module.exports = AuthPort;
