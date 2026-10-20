import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import routes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // Security
  app.use(helmet());
  // Credentialed CORS — policy lives in config/cors.js so the Vercel handler can
  // apply the exact same rules to responses the app itself never produces.
  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());

  // Gzip responses — JSON lists compress several times smaller.
  app.use(compression());

  if (env.isDevelopment) {
    app.use(morgan('dev'));
  }

  app.use('/api', apiLimiter);
  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
