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

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const otpExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

        const user = new User({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpires,
        });

        await user.save();

        await sendMail(email, "Verify your account", `Your OTP code is: ${otp}`);

        return res.status(201).json({ message: "User registered! Please check your email for the OTP." });

    } catch (err) {
        console.error("Registration error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// 📌 Verify OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.otp || user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        user.otp = null;
        user.otpExpires = null;
        await user.save();

        return res.json({ message: "Email verified successfully!" });

    } catch (err) {
        console.error("OTP verification error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// 📌 Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (user.otp) {
            return res.status(403).json({ message: "Please verify your email with OTP first" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        return res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });

    } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Server error" });
    }
};
