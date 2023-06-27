const jwt = require("jsonwebtoken");
const userModel = require("../db/models/userSchema");

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization;
    const verifyToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    const user = await userModel.findById(verifyToken._id);

    if (!user) {
      throw new Error("User Not Found !");
    }

    req.token = token;
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    res.status(401).json({ status: 401, message: "Unauthorized !" });
  }
};

module.exports = authenticate;
