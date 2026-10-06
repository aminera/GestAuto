import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { apiRouter } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';

export function createApp(gateway) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin.split(',') }));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter(gateway));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
