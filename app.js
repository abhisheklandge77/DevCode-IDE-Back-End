const express = require("express");
const cookieParser = require("cookie-parser");
require("dotenv").config();
require("./db/conn");

const cors = require("cors");

const router = require("./routes/router");

const app = express();
const port = process.env.PORT || 5050;

app.get("/", (req, res) => {
  res.status(201).json("DevCode server is working...");
});

app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(router);

app.listen(port, () => {
  console.log(`DevCode server started on http://localhost:${port}`);
});
