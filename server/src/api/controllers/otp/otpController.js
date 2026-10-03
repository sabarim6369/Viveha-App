import { sendOTP } from '../../../services/otpService.js';
export const sendOTPController = async (req, res) => {
    try {
        const { phoneNumber, purpose } = req.body;
        if (!phoneNumber || !purpose) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and purpose are required',
            });
        }
        const result = await sendOTP(phoneNumber, purpose);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
