import 'dotenv/config';

const required = (name, fallback) => {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Variable d'environnement manquante : ${name}`);
  return v;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  httpPort: Number(process.env.HTTP_PORT || 3000),
  tcpPort: Number(process.env.TCP_PORT || 5027),
  mongoUri: required('MONGO_URI', 'mongodb://127.0.0.1:27017/gestauto'),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'production' ? undefined : 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  // Accepter et enregistrer automatiquement un IMEI inconnu (pratique en dev, à désactiver en prod)
  autoRegisterDevices: process.env.AUTO_REGISTER_DEVICES === 'true',
  // Délai sans données avant de considérer un boîtier "hors ligne"
  offlineAfterMinutes: Number(process.env.OFFLINE_AFTER_MINUTES || 15),
  // Durée de rétention des positions brutes (jours, 0 = illimitée)
  positionsRetentionDays: Number(process.env.POSITIONS_RETENTION_DAYS || 180),
  documentReminderDays: Number(process.env.DOCUMENT_REMINDER_DAYS || 30),
};
