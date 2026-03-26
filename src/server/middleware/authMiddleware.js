const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'epc-dev-secret-change-in-production';

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Yetkisiz: token gerekli' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Geçersiz veya süresi dolmuş token' });
  }
}

function authenticateOptional(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (_) {
    req.user = null;
  }
  return next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Yetkisiz: kullanıcı gerekli' });
  }
  if (String(req.user.role || '').toLowerCase() !== 'admin') {
    return res.status(403).json({ success: false, error: 'Yönetici yetkisi gerekli' });
  }
  return next();
}

function n8nApiKey(req, res, next) {
  const key = req.headers['x-n8n-key'] || req.query.apiKey;
  const expected = process.env.N8N_API_KEY;
  if (!expected) {
    return res.status(503).json({
      success: false,
      error: 'N8N_API_KEY yapılandırılmamış',
    });
  }
  if (key !== expected) {
    return res.status(401).json({ success: false, error: 'Geçersiz n8n anahtarı' });
  }
  return next();
}

module.exports = {
  authenticate,
  authenticateOptional,
  requireAdmin,
  n8nApiKey,
  JWT_SECRET,
};
