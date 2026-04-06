require('dotenv').config({
  path: require('path').join(__dirname, '../../.env'),
});

const { createHttpServer } = require('../api/httpServer');
const db = require('../db/connection');
const { runMigrations } = require('../db/migrations');
const logger = require('./logger');
const cacheAdapter = require('./cache/cacheAdapter');

const app = createHttpServer();
const port = process.env.PORT || 3110;

async function startServer() {
  try {
    const testConnection = await db.query('SELECT NOW()');
    logger.info('DB:', testConnection.rows[0]);

    await runMigrations();

    if (cacheAdapter && typeof cacheAdapter.get === 'function') {
      logger.info('Cache adapter loaded (no-op until Redis wired)');
    }

    const server = app.listen(port, () => {
      logger.info(`EPC unified server http://localhost:${port}`);
      logger.info(`Web giriş: http://localhost:${port}/pages/login.html`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(
          `Port ${port} kullanımda. Diğer süreçleri kapatın veya PORT ayarlayın.`
        );
        process.exit(1);
      } else {
        logger.error('Server error:', error);
      }
    });
  } catch (error) {
    logger.error('Startup error:', error);
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});
