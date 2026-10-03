import * as businessService from '../../../services/businessService.js';
const badRequest = (res, msg) => res.status(400).json({ success: false, message: msg });
const serverError = (res, e) => res
    .status(500)
    .json({ success: false, message: e.message || 'Internal error' });
// ================= CLIENT CUSTOMER =================
export const createClientCustomerController = async (req, res) => {
    try {
        const { clientId, name, phone } = req.body;
        if (!clientId || !name || !phone)
            return badRequest(res, 'clientId,name,phone required');
        await businessService.createclientCustomer(clientId, name, phone, req.body.address, req.body.emailId, req.body.gstNo).then((data) => {
            return res.status(201).json(data);
        }).catch((e) => {
            return badRequest(res, e.message);
        });
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const createclientCustomerController = async (req, res) => createClientCustomerController(req, res);
export const getClientCustomersController = async (req, res) => {
    try {
        if (!req.params.clientId)
            return badRequest(res, 'clientId required');
        return res.json(await businessService.getclientCustomers(req.params.clientId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const getclientCustomersController = async (req, res) => getClientCustomersController(req, res);
export const getclientCustomerByPhoneController = async (req, res) => {
    try {
        const { clientId, phone } = req.params;
        if (!clientId || !phone)
            return badRequest(res, 'clientId and phone required');
        return res.json(await businessService.getclientCustomerByPhone(clientId, phone));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const updateclientCustomerController = async (req, res) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(await businessService.updateclientCustomer(clientId, clientCustomerId, req.body));
    }
    catch (e) {
        return serverError(res, e);
    }
};
export const deleteclientCustomerController = async (req, res) => {
    try {
        const { clientId, clientCustomerId } = req.params;
        if (!clientId || !clientCustomerId)
            return badRequest(res, 'clientId and clientCustomerId required');
        return res.json(await businessService.deleteclientCustomer(clientId, clientCustomerId));
    }
    catch (e) {
        return serverError(res, e);
    }
};
