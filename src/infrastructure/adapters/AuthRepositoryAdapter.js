const bcrypt = require('bcrypt');
const userRepository = require('../repositories/UserRepository');

class AuthRepositoryAdapter {
  async authenticate(username, password) {
    const user = await userRepository.findByUsername(username);
    if (!user) return null;
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return null;
    return user;
  }

  async isUsernameOrEmailTaken(username, email) {
    const users = await userRepository.findByUsernameOrEmail(username, email);
    return users.length > 0;
  }
}

module.exports = new AuthRepositoryAdapter();
