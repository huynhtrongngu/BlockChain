const mongoose = require("mongoose");

/**
 * Kết nối MongoDB cho Backend.
 *
 * Luồng dữ liệu:
 * - `mongoUri` (env `MONGODB_URI`) -> Mongoose driver -> MongoDB.
 *
 * @param {string} mongoUri Mongo connection string
 * @returns {Promise<import("mongoose").Connection>} Kết nối mongoose
 */
async function connectDb(mongoUri) {
  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = { connectDb };
