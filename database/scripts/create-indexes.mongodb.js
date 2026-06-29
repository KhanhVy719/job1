// Create MongoDB indexes for Rophim.
// Usage:
//   mongosh "$MONGODB_URI" database/scripts/create-indexes.mongodb.js

const databaseName = process.env.MONGO_DATABASE || 'rophim';
const targetDb = db.getSiblingDB(databaseName);

function ensure(collectionName, spec, options = {}) {
  print(`Ensuring index on ${collectionName}: ${JSON.stringify(spec)} ${JSON.stringify(options)}`);
  targetDb.getCollection(collectionName).createIndex(spec, options);
}

// movies
ensure('movies', { slug: 1 }, { unique: true, background: true });
ensure('movies', { name: 1 }, { background: true });
ensure('movies', { origin_name: 1 }, { background: true });
ensure('movies', { type: 1 }, { background: true });
ensure('movies', { status: 1 }, { background: true });
ensure('movies', { year: -1 }, { background: true });
ensure('movies', { view: -1 }, { background: true });
ensure('movies', { createdAt: -1 }, { background: true });
ensure('movies', { updatedAt: -1 }, { background: true });
ensure('movies', { category: 1 }, { background: true });
ensure('movies', { country: 1 }, { background: true });
ensure('movies', { 'tmdb.id': 1 }, { sparse: true, background: true });
ensure('movies', { 'imdb.id': 1 }, { sparse: true, background: true });
ensure('movies', { type: 1, status: 1, year: -1 }, { background: true });
ensure('movies', { type: 1, view: -1 }, { background: true });
ensure('movies', { status: 1, updatedAt: -1 }, { background: true });

// seasons
ensure('seasons', { movie_id: 1 }, { background: true });
ensure('seasons', { slug: 1 }, { background: true });
ensure('seasons', { season_number: 1 }, { background: true });
ensure('seasons', { movie_id: 1, season_number: 1 }, { unique: true, background: true });

// episodes
ensure('episodes', { movie_id: 1 }, { background: true });
ensure('episodes', { season_id: 1 }, { background: true });
ensure('episodes', { slug: 1 }, { background: true });
ensure('episodes', { episode: 1 }, { background: true });
ensure('episodes', { air_date: 1 }, { sparse: true, background: true });
ensure('episodes', { season_id: 1, episode: 1 }, { unique: true, background: true });
ensure('episodes', { movie_id: 1, air_date: 1 }, { sparse: true, background: true });

// scheduledepisodes: local /lich-chieu and /showtimes/by-date source
ensure('scheduledepisodes', { movie_id: 1 }, { sparse: true, background: true });
ensure('scheduledepisodes', { movie_slug: 1 }, { background: true });
ensure('scheduledepisodes', { show_date: 1 }, { background: true });
ensure('scheduledepisodes', { show_date: 1, show_time: 1 }, { background: true });
ensure('scheduledepisodes', { show_date: 1, movie_slug: 1, episode: 1 }, { unique: true, background: true });
ensure('scheduledepisodes', { source: 1, source_id: 1 }, { background: true });
ensure('scheduledepisodes', { is_active: 1 }, { background: true });

// users
ensure('users', { email: 1 }, { unique: true, background: true });
ensure('users', { 'favorites': 1 }, { sparse: true, background: true });
ensure('users', { 'history.movie': 1 }, { sparse: true, background: true });
ensure('users', { createdAt: -1 }, { background: true });

print('Rophim MongoDB indexes ensured.');
