const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    otp: String,
    otpExpires: Date
});
