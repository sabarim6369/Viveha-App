export const validateSendOTP = (req, res, next) => {
    const { phoneNumber, purpose } = req.body;
    if (!phoneNumber || !purpose) {
        return res.status(400).json({
            success: false,
            message: 'Phone number and purpose are required',
        });
    }
    next();
};
