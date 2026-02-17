import * as businessService from '../../../services/businessService.js';

const badRequest = (res, msg) =>
  res.status(400).json({ success: false, message: msg });
const serverError = (res, e) =>
  res
    .status(500)
    .json({ success: false, message: e.message || 'Internal error' });

// ================= ITEM GROUP =================

export const createItemGroupController = async (req, res) => {
  try {
    const { clientId, name, description } = req.body;
    if (!clientId || !name)
      return badRequest(res, 'clientId and name required');
    return res
      .status(201)
      .json(await businessService.createItemGroup(clientId, name, description));
  } catch (e) {
    return serverError(res, e);
  }
};

export const getItemGroupsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) return badRequest(res, 'clientId required');
    return res.json(await businessService.getItemGroups(clientId));
  } catch (e) {
    return serverError(res, e);
  }
};

export const updateItemGroupController = async (req, res) => {
  try {
    const { clientId, groupId } = req.params;
    if (!clientId || !groupId)
      return badRequest(res, 'clientId and groupId required');
    return res.json(
      await businessService.updateItemGroup(clientId, groupId, req.body),
    );
  } catch (e) {
    return serverError(res, e);
  }
};

export const deleteItemGroupController = async (req, res) => {
  try {
    const { clientId, groupId } = req.params;
    if (!clientId || !groupId)
      return badRequest(res, 'clientId and groupId required');
    return res.json(await businessService.deleteItemGroup(clientId, groupId));
  } catch (e) {
    return serverError(res, e);
  }
};

// ================= ITEMS =================

export const createItemController = async (req, res) => {
  try {
    const { clientId, name, price, stock, unit, groupId, description } =
      req.body;
    if (!clientId || !name || price === undefined)
      return badRequest(res, 'clientId,name,price required');
    return res
      .status(201)
      .json(
        await businessService.createItem(
          clientId,
          name,
          price,
          stock,
          unit,
          groupId,
          description,
        ),
      );
  } catch (e) {
    return serverError(res, e);
  }
};

export const getItemsController = async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) return badRequest(res, 'clientId required');
    return res.json(
      await businessService.getItems(clientId, req.query.groupId),
    );
  } catch (e) {
    return serverError(res, e);
  }
};

export const updateItemController = async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    if (!clientId || !itemId)
      return badRequest(res, 'clientId and itemId required');
    return res.json(
      await businessService.updateItem(clientId, itemId, req.body),
    );
  } catch (e) {
    return serverError(res, e);
  }
};

export const deleteItemController = async (req, res) => {
  try {
    const { clientId, itemId } = req.params;
    if (!clientId || !itemId)
      return badRequest(res, 'clientId and itemId required');
    return res.json(await businessService.deleteItem(clientId, itemId));
  } catch (e) {
    return serverError(res, e);
  }
};
