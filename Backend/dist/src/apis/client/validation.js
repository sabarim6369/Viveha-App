export const validateUpdateClient = (req, res, next) => {
    const { clientId } = req.params;
    if (!clientId) {
        return res.status(400).json({
            success: false,
            message: 'Client ID is required',
        });
    }
    if (!Object.keys(req.body || {}).length) {
        return res.status(400).json({
            success: false,
            message: 'No updates provided',
        });
    }
    next();
};
