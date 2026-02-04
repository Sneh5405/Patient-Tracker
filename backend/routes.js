import express from 'express';
import signin from './auth/signin.js';
import setPassword from './auth/setPassword.js';
import forgotPassword from './auth/forgotPassword.js';
import resetPassword from './auth/resetPassword.js';

const router = express.Router();

// Authentication routes
router.post('/auth/signin', signin);
router.post('/auth/set-password', setPassword);
router.post('/auth/forgot-password', forgotPassword);
router.post('/auth/reset-password', resetPassword);

export default router; 