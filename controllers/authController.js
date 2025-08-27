const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendMail = require('../utils/sendEmail');

// Generate random 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 📌 Register
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: "Email already registered" });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = Date.now() + 15 * 60 * 1000; // 15 min expiry

        // Create user
        user = new User({ name, email, password: hashedPassword, otp, otpExpires });
        await user.save();

        // Send OTP via email
        await sendMail(email, "Verify your account", `Your OTP code is: ${otp}`);

        res.status(201).json({ message: "User registered! Please check your email for OTP." });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 📌 Verify OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        // OTP verified -> clear otp fields
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ message: "Email verified successfully!" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// 📌 Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "User not found" });

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Check if verified (must not have OTP pending)
        if (user.otp) {
            return res.status(400).json({ message: "Please verify your email with OTP first" });
        }

        // Generate JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
