const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../db/models/userSchema");
const authenticate = require("../middleware/authenticate");
const nodemailer = require("nodemailer");
const mailBody = require("../constants/mailBody");

// Nodemailer Config
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.DEVCODE_EMAIL,
    pass: process.env.DEVCODE_EMAIL_PASSWORD,
  },
});

const router = new express.Router();

// For user registration
router.post("/register", async (req, res) => {
  console.log("Register:::", req.body);

  const { userName, email, password } = req.body;

  if (!userName || !email || !password) {
    res.status(400).json({ error: "All fields are required !" });
  }

  try {
    const oldUser = await userModel.findOne({ email });

    if (oldUser) {
      res.status(400).json({ error: "User already exists !" });
    } else {
      // Password hashing
      const hashedPassword = await bcrypt.hash(password, 12);

      const userObj = new userModel({
        userName,
        email: email.toLowerCase(),
        password: hashedPassword,
      });

      const storedData = await userObj.save();
      console.log("Stored Data::", storedData);

      const mailOptions = {
        from: process.env.DEVCODE_EMAIL,
        to: email,
        subject: "Welcome to DevCode IDE",
        html: mailBody.getRegisterBody({ name: userName }),
      };

      transporter.sendMail(mailOptions, (err, data) => {
        if (err) {
          console.log("Error =>", err);
        } else {
          console.log("Register Mail send successfully", data);
        }
      });

      res.status(201).json({
        status: 201,
        data: storedData,
        message: "User Registered Successfully",
      });
    }
  } catch (error) {
    res.status(500).json(error);
    console.log("Error:", error);
  }
});

// For user login
router.post("/login", async (req, res) => {
  console.log("Login body:::", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "All fields are required !" });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      res.status(404).json({ error: "User does not exists !" });
    } else {
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        res.status(400).json({ error: "Invalid Credentials !" });
      } else {
        const jwtToken = jwt.sign(
          { _id: user._id, email: user.email },
          process.env.JWT_SECRET_KEY,
          {
            expiresIn: "2h",
          }
        );

        user.tokens = user.tokens.concat({ token: jwtToken });
        const storedData = await user.save();
        console.log("Stored Data::", storedData);

        res.cookie("authtoken", jwtToken, {
          expires: new Date(Date.now() + 3600000),
          httpOnly: true,
        });

        res.status(201).json({
          status: 201,
          data: { ...storedData, token: jwtToken },
          message: "User Login Successfully",
        });
      }
    }
  } catch (error) {
    res.status(500).json(error);
    console.log("Error:", error);
  }
});

// For user validation
router.get("/validateUser", authenticate, async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);

    res.status(201).json({
      status: 201,
      data: user,
      message: "Valid User",
    });
  } catch (error) {
    console.log("Error:", error);
    res.status(401).json({ status: 401, error });
  }
});

// For user logout
router.get("/logout", authenticate, async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);

    user.tokens = [];
    user.save();

    res.clearCookie("authtoken", { path: "/" });
    res.status(201).json({
      status: 201,
      message: "User logout successfully",
    });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ status: 401, error });
  }
});

// For forgot password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: "Email is required !" });
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      res.status(404).json({ error: "User does not exists !" });
    } else {
      // Generate token for reset password
      const resetPasswordToken = jwt.sign(
        { _id: user._id },
        process.env.JWT_SECRET_KEY,
        {
          expiresIn: "600s",
        }
      );

      if (resetPasswordToken) {
        user.verificationToken = resetPasswordToken;
        user.save();
        const link = `${process.env.DEVCODE_FRONTEND_BASE_URL}/reset-password/${
          user._id
        }/${btoa(resetPasswordToken)}`;
        const mailOptions = {
          from: process.env.DEVCODE_EMAIL,
          to: email,
          subject: "Reset Password",
          html: mailBody.getResetPasswordBody({ name: user.userName, link }),
        };

        transporter.sendMail(mailOptions, (err, data) => {
          if (err) {
            console.log("Error =>", err);
            res
              .status(500)
              .json({ status: 500, error: "Failed to send email" });
          } else {
            console.log("Mail send successfully", data);
            res
              .status(201)
              .json({ status: 201, message: "Email send successfully" });
          }
        });
      }
    }
  } catch (error) {
    console.log("Error:", error);
    res.status(401).json({ status: 401, error });
  }
});

// For reset password
router.post("/reset-password/:id/:token", async (req, res) => {
  const { id, token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    res.status(400).json({ error: "Password is required !" });
  }
  if (!id || !token) {
    res.status(400).json({ error: "Id or Token is missing !" });
  }

  try {
    const user = await userModel.findOne({
      _id: id,
      verificationToken: token,
    });

    const verifyToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (!user) {
      res.status(404).json({ error: "User does not exists !" });
    }
    if (!verifyToken) {
      res.status(400).json({ error: "Token has expired !" });
    } else {
      // Hashing new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      const updatedUser = await userModel.findByIdAndUpdate(
        { _id: user._id },
        { password: hashedPassword }
      );
      updatedUser.save();

      res.status(201).json({
        status: 201,
        data: updatedUser,
        message: "Password Updated Successfully",
      });
    }
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ status: 500, error });
  }
});

// For save project
router.post("/save-project", async (req, res) => {
  const { id, projectName, htmlCode, cssCode, jsCode, projectId } = req.body;

  try {
    if (projectId) {
      const updatedUser = await userModel.findByIdAndUpdate(
        {
          _id: id,
        },
        {
          $set: {
            "projects.$[project].projectName": projectName,
            "projects.$[project].html": htmlCode,
            "projects.$[project].css": cssCode,
            "projects.$[project].js": jsCode,
          },
        },
        {
          arrayFilters: [{ "project._id": projectId }],
          new: true,
        }
      );
      await updatedUser.save();

      res.status(201).json({
        status: 201,
        data: updatedUser,
        message: `Project ${projectName} saved Successfully`,
      });
    } else {
      const updatedUser = await userModel.findByIdAndUpdate(
        { _id: id },
        {
          $addToSet: {
            projects: {
              projectName,
              html: htmlCode,
              css: cssCode,
              js: jsCode,
            },
          },
        },
        { new: true }
      );

      const storedData = await updatedUser.save();
      console.log("User Data project:::", storedData);

      res.status(201).json({
        status: 201,
        data: storedData,
        message: `Project ${projectName} saved Successfully`,
      });
    }
  } catch (error) {
    res.status(500).json({ status: 500, error: "Failed to save project !" });

    console.log("Error:", error);
  }
});

// For user update
router.post("/update-user", async (req, res) => {
  const { userName, email, userId } = req.body;

  if (!userName || !email) {
    res.status(400).json({ status: 400, error: "All fields are required !" });
  }
  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      { _id: userId },
      { userName, email },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ status: 404, error: "User does not exists !" });
    }
    updatedUser.save();

    res.status(201).json({
      status: 201,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ status: 401, error });
  }
});

router.post("/delete-project", async (req, res) => {
  const { userId, project } = req.body;

  try {
    const updatedUser = await userModel.findByIdAndUpdate(
      { _id: userId },
      {
        $pull: {
          projects: project,
        },
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      res.status(404).json({ status: 404, error: "User does not exists !" });
    }
    updatedUser.save();

    res.status(201).json({
      status: 201,
      message: "Project Deleted successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ status: 401, error });
  }
});

module.exports = router;
