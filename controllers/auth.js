import { validationResult } from "express-validator";
import requestip from "request-ip";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import Favorite from "../models/AddToFavorite.js";

import transporter from "../util/nodemailer.js";
import User from "../models/user.js";

//RESEND TOKEN
export const resendToken = async (req, res, next) => {
  const email = req.body.email;
  try {
    //CHECK IF EMAIL EXIST
    const user = await User.findOne({ email: email });

    //GENERATE TOKEN
    const token = crypto.randomBytes(32).toString("hex");

    //SEND EMAIL
    const sendedemail = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Hello to assaf  ✔",
      text: "welcome for submitting",
      html: `
            <h2>Thanks for signing up with Assaf !
            Resending Token
            You must follow this link within 1 hour of registration to activate your account:</h2>
            <a href="${process.env.URL}/auth/verify?token=${token}">Click Here</a>
            <h3>Have fun, and don't hesitate to contact us with your feedback.<h3>

            <a href="http://localhost:8080/about">The Assaf Team!</a>`,
    });

    //UPDATE USER INFO
    (user.userToken = token), (user.userTokenExpires = Date.now() + 3600000);
    const awaitedUser = await user.save();

    return res.status(200).json({
      success: true,
      message: "Token In Your Inbox!",
    });
  } catch (err) {
    next(err);
  }
};

//SIGN UP
export const signup = async (req, res, next) => {
  //EXTRACT USER IP
  let clientIp = requestip.getClientIp(req);

  //VALIDATE USER INPUTS
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    return res.status(400).json({
      error: error,
      message: error.data,
    });
  }

  const { email, name, password } = req.body;
  const token = crypto.randomBytes(32).toString("hex");

  try {
    //BCRYPT PASSWORD
    const hashedpassword = await bcrypt.hash(password, 12);

    //CREATING USER
    const user = new User({
      email: email,
      password: hashedpassword,
      name: name,
      userToken: token,
      userTokenExpires: Date.now() + 3600000,
      IpAddress: {
        Ip: [clientIp],
        IpToken: "",
        IpTokenExpires: 0,
      },
      wrongPassword: {
        Attempt: 3,
        Forbidden: false,
        ForbiddenTime: 0,
      },
    });
    await user.save();

    await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Hello to assaf  ✔",
      text: "welcome for submitting",
      html: `

          <h2>Thanks for signing up with Assaf !
          You must follow this link within 1 hour of registration to activate your account:</h2>
          <a href="${process.env.URL}/auth/verify?token=${token}">Click Here</a>
          <h3>Have fun, and don't hesitate to contact us with your feedback.<h3>

          <a href="http://localhost:3000/about">The Assaf Team!</a>`,
    });

    //CREATE NEW Favorite
    const favorite = new Favorite({
      userId: user._id,
      posts: [],
    });
    await favorite.save();

    return res.status(201).json({
      message: "User created!",
      message_email: "email sended",
      user: user,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
    return err;
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body;
  let clientIp = requestip.getClientIp(req);

  try {
    //CHECK IF USER EXIST
    const user = await User.findOne({ email: email });

    //ELSE SEND ERROR
    if (!user) {
      return res.status(401).json({
        messageError: "A user with this email could not be found.",
      });
    }

    //CHECK IF VERIFIED
    if (!user.emailVerified) {
      return res.status(401).json({
        messageError: "Not authorized please verify your email first",
      });
    }

    let Forbiddentemporary;

    //CHECK IF HE'S BANNED
    if (
      user.wrongPassword.Forbidden ||
      Date.now() < user.wrongPassword.ForbiddenTime.getTime()
    ) {
      if (user.wrongPassword.Forbidden) {
        return res.status(403).json({
          messageError: `you are forbidden we advice you wo contact us!`,
        });
      }

      const result = user.wrongPassword.ForbiddenTime;
      const d = new Date();
      const remaining = result.getMinutes() - d.getMinutes();

      if (user.wrongPassword.Attempt === 0) {
        Forbiddentemporary = true;
      }
      return res.status(403).json({
        messageError: `you are forbidden and you still have ${remaining} minute  Be carfully this is ur last attempt!`,
      });
    }

    //CHECK IF PASSWORD IS TRUE
    const isEqual = await bcrypt.compare(password, user.password);

    //USER BAN SHOW ERROR IF ATTEMPTS ARE 0
    if (user.wrongPassword.Attempt === 0 && !isEqual) {
      const error = new Error(`Oops! you are forbidden please contact us`);
      user.wrongPassword.Forbidden = true;
      await user.save();
      error.statusCode = 403;
      throw error;
    }

    //IF NOT EQUAL REDUCE ATTEMPTS BY ONE
    if (!isEqual) {
      user.wrongPassword.Attempt = user.wrongPassword.Attempt - 1;
      if (user.wrongPassword.Attempt === 0) {
        user.wrongPassword.ForbiddenTime = Date.now() + 90000;

        await user.save();

        //RETURN ERROR MESSAGE
        return res.status(403).json({
          messageError: `you are forbidden for ${user.wrongPassword.ForbiddenTime}  `,
        });
      }
      await user.save();
      return res.status(401).json({
        messageError: "Wrong password!",
      });
    }
    const wrongPassword = {
      Attempt: 3,
      Forbidden: false,
      ForbiddenTime: 0,
    };

    //UPDATE USER
    user.wrongPassword = wrongPassword;

    await user.save();

    //ELSE EVERYTHING OKAY THEN LOGIN USER
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
        admin: user.admin,
      },
      "secret",
      { expiresIn: "1h" }
    );

    //CHECK IF THIS IP EXIST
    const checkIp = await User.find({
      "IpAddress.Ip": { $in: [clientIp] },
      _id: user._id,
    });

    //IF NOT EXIST
    //THEN THIS IP IS NEW

    if (checkIp.length <= 0) {
      //GENREATE TOKEN AND UPDATE USER
      const token = crypto.randomBytes(32).toString("hex");

      user.IpAddress.IpToken = token;
      user.IpAddress.IpTokenExpires = Date.now() + 3600000;
      await user.save();

      //SEND EMAIL TO USER
      await transporter.sendMail({
        from: process.env.NODEMAILER_EMAIL,
        to: email,
        subject: "Verify Login from New Location",
        text: `Welcome ${user.name} again !`,
        html: `<h1>IP ADDRESS : ${clientIp} </h1>
              <h2>It looks like someone tried to log into your account from a new location.
              If this is you, follow the link below to authorize logging in from this location on your account.
              If this isn't you, we suggest changing your password as soon as possible.</h2>
              <a href="${process.env.URL}/auth/ipVerification?token=${token}">Click Here</a>
    
                     <a href="${process.env.URL}/about">The Assaf Team!</a>`,
      });

      return res.status(401).json({
        success: false,
        error: "Failed to Verify Ip Please Check your inbox.",
        message: "Unauthorized",
      });
    }

    return res.status(200).json({
      success: true,
      jwt: token,
      userId: user._id.toString(),
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
    return err;
  }
};

//VERIFY USER
export const getVerified = async (req, res, next) => {
  const resetToken = req.params.token;

  try {
    //CHECK IF TOKEN IS VALID
    const user = await User.findOne({
      userToken: resetToken,
      userTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      const error = new Error("we cant find user with this token");
      error.statusCode = 401;
      throw error;
    }

    //UPDATE USER
    user.emailVerified = true;
    user.userToken = "";
    user.userTokenExpires = 0;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email Successfully Verified!",
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Failed to Verify Email.",
    });
  }
};

//EXTRACT PASSWORD TO RESET
export const postResetpassword = async (req, res, next) => {
  try {
    //VALIDATE USER INFO
    const error = validationResult(req);

    //CHECK UF ERROR EXIST
    if (!error.isEmpty()) {
      const error = new Error("Password validation error ");
      error.statusCode = 422;
      throw error;
    }
    const { token } = req.params;
    const { password } = req.body;

    //CHECK IF USER EXIST
    const user = await User.findOne({
      userToken: token,
      userTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      const error = new Error("no user");
      error.statusCode = 404;
      throw error;
    }

    //HASH PASSWORD
    const hashedpassword = await bcrypt.hash(password, 12);

    //SAVE IT AND UPDATE USER
    user.password = hashedpassword;
    user.userToken = "";
    user.userTokenExpires = 0;
    const usersaved = await user.save();

    return res.status(201).json({
      success: true,
      message: "Password Successfully Updated.",
    });
  } catch (err) {
    return res.status(503).json({
      success: false,
      message: "Server side error",
    });
  }
};

export const SendResetpassword = async (req, res, next) => {
  const email = req.body.email;

  try {
    const user = await User.findOne({ email: email });
    //GENERATE TOKEN
    const token = crypto.randomBytes(32).toString("hex");

    if (!user) {
      const error = new Error("No user found");
      error.statusCode = 404;
      throw error;
    }

    //UPDATE USER
    user.userToken = token;
    user.userTokenExpires = Date.now() + 3600000;
    await user.save();

    //SEND EMAIL WITH TOKEN TO USER
    await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Reset your Password",
      text: "Welcome again !",
      html: `
                <h2>Someone (hopefully you) has requested a password reset for your  account. Follow the link below to set a new password::</h2>
                <a href="${process.env.URL}/auth/resetPassword?token=${token}">Click Here</a>
                <h3>If you don't wish to reset your password, disregard this email and no action will be taken.<h3>
  
                   <a href="${process.env.URL}/about">The Assaf Team!</a>`,
    });

    //send message that email was sent
    return res.status(200).json({
      success: true,
      message: `Verification Password sent to ${email}!`,
    });
  } catch (err) {
    next(err);
  }
};

//CHANGE PASSWORD
export const changePassword = async (req, res, next) => {
  //VALIDATE USER INFO
  const error = validationResult(req);

  //IF ERROR EXIST THEN RETURN IT
  if (!error.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: error,
    });
  }

  try {
    //GET USER
    const user = await User.findOne({ _id: req.userId });
    const { oldPassword, newPassword } = req.body;

    //CHECK IF OLD PASSWORD IS THE SAME
    const isEqual = await bcrypt.compare(oldPassword, user.password);

    //IF NOT SEND ERROR
    if (!isEqual)
      return res.status(422).json({
        success: false,
        error: "The provided credentials are incorrect",
      });

    //HASH PASSWORD
    let hashedpassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedpassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been changed",
    });
  } catch (err) {
    next(err);
  }
};

//IP VERIFICATION
export const IpVerification = async (req, res, next) => {
  try {
    //EXCTRACT TOKEN
    const token = req.params.token;

    //EXTRACT USER WHERE TOKEN EXIST
    const user = await User.findOne({
      "IpAddress.IpToken": token,
      "IpAddress.IpTokenExpires": { $gt: Date.now() },
    });

    //IF NOT THEN SEND ERROR
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `Expired Verification url`,
      });
    }

    //THEN EXTRACT IP AND PUSH IT TO USER INFO
    let clientIp = requestip.getClientIp(req);

    user.IpAddress.Ip.push(clientIp);
    user.IpAddress.IpToken = "";
    user.IpAddress.IpTokenExpires = 0;
    const updatedUser = await user.save();
    res.status(200).json({
      success: true,
      message: `Done! You can now login from this new location `,
    });

    return updatedUser;
  } catch (err) {
    next(err);
  }
};
