/**
 * TEMPORARY helper (delete after use) — runs migrateToAtlas.js with the target
 * taken from server/.env, so the connection string never has to be typed on the
 * command line or pasted into a terminal.
 *
 * Add this line to server/.env (and nothing else changes):
 *
 *   ATLAS_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/Animals-super-store
 *
 * MONGO_URI stays on 127.0.0.1 — it is the SOURCE of the copy, not the target.
 */
import 'dotenv/config';

const target = process.env.ATLAS_URI ?? process.env.TARGET_URI;

if (!target) {
  console.error(
    [
      '',
      'server/.env me ATLAS_URI set nahi hai.',
      '',
      '  ATLAS_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/Animals-super-store',
      '',
      'Atlas dashboard -> Connect -> Drivers se connection string milegi.',
      `Filhaal MONGO_URI = ${process.env.MONGO_URI} (ye source hai, target nahi).`,
    ].join('\n')
  );
  process.exit(1);
}

process.env.TARGET_URI = target;
await import('./migrateToAtlas.js');
