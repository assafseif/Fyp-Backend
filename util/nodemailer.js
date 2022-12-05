
import nodemailer from 'nodemailer'
import * as dotenv from "dotenv";
dotenv.config();


let testAccount = nodemailer.createTestAccount();


let transporter =  nodemailer.createTransport({
  service: "Outlook365",
  host: "smtp.office365.com",
  port: "587",
  secure: false,
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});


  

export default transporter;