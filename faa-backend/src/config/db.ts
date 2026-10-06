import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

let connectionPromise: Promise<typeof mongoose> | undefined;

export async function connectDB(): Promise<typeof mongoose> {
  // Reuse the connection held by a warm serverless instance. This also prevents
  // concurrent requests after a cold start from each opening a MongoDB socket.
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.mongoUri)
      .then((conn) => {
        // eslint-disable-next-line no-console
        console.log(`[db] MongoDB conectado: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      })
      .catch((error: unknown) => {
        connectionPromise = undefined;
        throw error;
      });
  }

  return connectionPromise;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  connectionPromise = undefined;
}
