require('dotenv').config({
  path: require('path').join(__dirname, '../../.env'),
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const responseTime = require('response-time');
const apiRouter = require('./api');
const db = require('../db/connection');
const { runMigrations } = require('../db/migrations');
const logger = require('./logger');
const cacheAdapter = require('./cache/cacheAdapter');

const app = express();
const port = process.env.PORT || 3110;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.use(
  responseTime((req, res, time) => {
    if (time > 1000) {
      logger.warn(`Slow response: ${req.method} ${req.url} - ${time}ms`);
    }
  })
);

const srcRoot = path.join(__dirname, '..');
app.use(express.static(srcRoot));

app.use('/api', apiRouter);

// Kök URL'de login'e yönlendir
app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

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
