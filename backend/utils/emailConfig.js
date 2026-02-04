import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create a Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use Gmail as the email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export default transporter; 