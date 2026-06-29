import mongoose, { Mongoose } from "mongoose";


const uri: string = (() => {
  const val = process.env.MONGODB_URI;
  if (!val) throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  return val;
})();

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

const globalWithMongoose = globalThis as typeof globalThis & {
  mongoose: MongooseCache;
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = { conn: null, promise: null };
}

const cached = globalWithMongoose.mongoose;

async function dbConnect(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
