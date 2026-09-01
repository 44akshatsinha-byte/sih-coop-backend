const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // This tells Mongoose to connect using the secret link in your .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Error: ${error.message}`);
    process.exit(1); // Kills the server if the database fails to connect
  }
};

module.exports = connectDB;