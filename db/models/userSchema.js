const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    validate(value) {
      if (!validator.isEmail(value)) {
        throw new Error("Invalid Email");
      }
    },
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 6,
  },
  verificationToken: {
    type: String,
  },
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
  projects: [
    {
      projectId: {
        type: String,
      },
      projectName: {
        type: String,
      },
      html: {
        type: String,
      },
      css: {
        type: String,
      },
      js: {
        type: String,
      },
    },
  ],
});

const userModel = new mongoose.model("users", userSchema);
module.exports = userModel;
