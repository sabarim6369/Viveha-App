import { getClientDetails, updateClientProfile, } from '../../../services/clientService.js';
export const getClientController = async (req, res) => {
    try {
        const { clientId } = req.params;
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required',
            });
        }
        const result = await getClientDetails(clientId);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(404).json({
            success: false,
            message: error.message,
        });
    }
};
export const updateClientController = async (req, res) => {
    try {
        const { clientId } = req.params;
        const updateData = req.body || {};
        console.log('Updating client profile with data:', updateData);
        if (!clientId) {
            return res.status(400).json({
                success: false,
                message: 'Client ID is required',
            });
        }
        if (!Object.keys(updateData).length) {
            return res.status(400).json({
                success: false,
                message: 'No updates provided',
            });
        }
        const result = await updateClientProfile(clientId, updateData);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message,
        });
    }
};
