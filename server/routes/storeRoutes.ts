import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createStore, getAllMerchants, getAllStores, getMyStore, onboardMerchant, toggleStoreStatus, updateMyStore } from "../controller/storeController.js";

const storeRouter = Router()

// MERCHAT ROUTES
storeRouter.post('/', requireAuth, createStore)
storeRouter.post('/onboard-merchant', requireAuth, onboardMerchant)
storeRouter.get('/me', requireAuth, getMyStore)
storeRouter.get('/me', requireAuth, updateMyStore)

//ADMIN ROUTES
storeRouter.get('/admin/all', requireAuth, requireRole(["admin"]), getAllStores)
storeRouter.get('/admin/merchants', requireAuth, requireRole(["admin"]), getAllMerchants)
storeRouter.get('/admin/:storeId/status', requireAuth, requireRole(["admin"]), toggleStoreStatus)



export default storeRouter;