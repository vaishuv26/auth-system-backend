const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify-otp', authController.verifyOtp);

// Remove send-otp and reset-password until implemented
// router.post('/send-otp', authController.sendOtp);
// router.post('/reset-password', authController.resetPassword);

module.exports = router;
