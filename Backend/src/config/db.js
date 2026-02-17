import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const baseUrl = process.env.MONGO_URL;
    if (!baseUrl) {
      throw new Error('MONGO_URL is not defined in .env');
    }

    const dbName = process.env.MONGO_DB_NAME || 'vivekaDB';
    let mongoUrl;

    try {
      const url = new URL(baseUrl);
      const hasDbPath = url.pathname && url.pathname !== '/';

      if (!hasDbPath) {
        url.pathname = `/${dbName}`;
      }

      mongoUrl = url.toString().replace(/\/$/, '');
    } catch (parseError) {
      throw new Error(`Invalid MONGO_URL: ${parseError.message}`);
    }

    await mongoose.connect(mongoUrl);

    console.log('✅ MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected');
  } catch (error) {
    console.error('❌ MongoDB disconnection error:', error.message);
  }
};
