const express = require('express');
const cors = require('cors');
const compression = require('compression');
const responseTime = require('response-time');
const path = require('path');

const apiRouter = require('./index');
const logger = require('../server/logger');

function createHttpServer() {
  const app = express();
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
  app.get('/', (req, res) => res.redirect('/pages/login.html'));
  return app;
}

module.exports = { createHttpServer };
