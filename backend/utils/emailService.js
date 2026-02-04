import dotenv from 'dotenv';
import transporter from './emailConfig.js';

dotenv.config();

/**
 * Send an invitation email with password setup link
 * @param {string} patientEmail - Email address of the patient
 * @param {string} patientName - Name of the patient
 * @param {string} token - JWT token for password setup
 */
export const sendInviteEmail = async (patientEmail, patientName, token) => {
  const link = `${process.env.FRONTEND_URL}/set-password?token=${token}`;
  
  try {
    const mailOptions = {
      from: `"Patient Tracker" <${process.env.EMAIL_USER}>`,
      to: patientEmail,
      subject: 'Welcome to Patient Tracker - Set Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Welcome to Patient Tracker!</h2>
          <p>Hello ${patientName},</p>
          <p>You've been added to the Patient Tracker system by your doctor. Please set up your password to access your account.</p>
          <p><a href="${link}" style="background-color: #4299e1; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Set Your Password</a></p>
          <p>This link will expire in 24 hours for security purposes.</p>
          <p>If you didn't expect this email, please ignore it.</p>
          <p>Best regards,<br>Patient Tracker Team</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Invitation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error.message);
    return false;
  }
};

/**
 * Send a password reset email with reset link
 * @param {string} userEmail - Email address of the user
 * @param {string} userName - Name of the user
 * @param {string} token - JWT token for password reset
 */
export const sendPasswordResetEmail = async (userEmail, userName, token) => {
  const link = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  
  try {
    const mailOptions = {
      from: `"Patient Tracker" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: 'Password Reset - Patient Tracker',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4a5568;">Password Reset</h2>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password for your Patient Tracker account. Click the button below to reset your password:</p>
          <p><a href="${link}" style="background-color: #4299e1; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Reset Your Password</a></p>
          <p>This link will expire in 1 hour for security purposes.</p>
          <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <p>Best regards,<br>Patient Tracker Team</p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    return false;
  }
};

export default {
  sendInviteEmail,
  sendPasswordResetEmail
};
