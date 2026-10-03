export const validateRegister = (req, res, next) => {
    const { phoneNumber, otp, ownerName, businessName } = req.body;
    if (!phoneNumber || !otp || !ownerName || !businessName) {
        return res.status(400).json({
            success: false,
            message: 'Phone number, OTP, owner name, and business name are required',
        });
    }
    next();
};
export const validateLogin = (req, res, next) => {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and OTP are required',
        });
    }
    next();
};
