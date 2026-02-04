import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Ensure environment variables are loaded
dotenv.config();

// Check if JWT_SECRET is available and set a fallback if needed
const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    console.warn(
      "WARNING: JWT_SECRET is not set in environment. Using fallback secret."
    );
    return "mysecret"; // Fallback secret - ideally this should never be used in production
  }
  return process.env.JWT_SECRET;
};

export function tokenGenerate(user, expiresIn = "24h") {
  try {
    // Get the JWT secret
    const jwtSecret = getJwtSecret();

    // Sign token with all user information
    // This way we include all fields like purpose, patientId, etc.
    const token = jwt.sign(
      user,
      jwtSecret,
      { expiresIn: expiresIn }
    );

    return token;
  } catch (error) {
    console.error("Error generating token:", error);
    throw error;
  }
}

export function tokenVerify(token) {
  try {
    // Get the JWT secret
    const jwtSecret = getJwtSecret();

    // Verify the token
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return null;
  }
}
