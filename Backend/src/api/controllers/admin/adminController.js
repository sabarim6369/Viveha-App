import mongoose from 'mongoose';

export const flushDatabaseController = async (req, res) => {
  try {
    await mongoose.connection.dropDatabase();

    return res.status(200).json({
      success: true,
      message: 'Database dropped successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: `Failed to drop database: ${error.message}`,
    });
  }
};
