import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Cached connection promise.
 *
 * On Vercel a warm function instance runs this module at most once, and a cold
 * start must not open a connection per request. Memoising the *promise* rather
 * than the resolved connection also collapses the race where several concurrent
 * cold-start invocations each call connectDatabase() — they all await the one
 * in-flight attempt instead of opening competing connections.
 *
 * Local `node server.js` is unaffected: it calls this once at boot and the
 * cache simply holds that single connection for the process lifetime.
 */
let connectionPromise = null;

export function connectDatabase() {
  if (!connectionPromise) {
    mongoose.set('strictQuery', true);

    connectionPromise = mongoose
      .connect(env.mongoUri, {
        // Serverless scales out (many small instances) rather than up, so the
        // driver's default pool of 100 sockets per instance exhausts a shared
        // cluster's connection limit long before the traffic justifies it.
        maxPoolSize: 10,
        // Fail fast rather than hanging the request until the platform's own
        // timeout kills it, so the client still gets a real error envelope.
        serverSelectionTimeoutMS: 10_000,
      })
      .then((m) => {
        const { host, name } = m.connection;
        console.log(`[db] MongoDB connected: ${host}/${name}`);
        return m.connection;
      })
      .catch((err) => {
        // Drop the rejected promise so the next invocation retries instead of
        // re-awaiting a permanent failure for the life of the instance.
        connectionPromise = null;
        throw err;
      });
  }

  return connectionPromise;
}
