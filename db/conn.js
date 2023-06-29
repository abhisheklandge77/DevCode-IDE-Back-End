const mongoose = require("mongoose");

const DB_URI = process.env.DB_CONNECTION_URI;

mongoose
  .connect(DB_URI, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Database connected successfully...");
  })
  .catch((err) => {
    console.log("Error::", err);
  });
