import { Router } from "express";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { createOrder, getCustomerOrder, getMerchantOrders, getOrderReceipt, updateOrderStatus } from "../controller/orderController.js";


const orderRouter = Router()

// PUBLIC CHECKOUT & RECEPIT
orderRouter.post('/checkout' , optionalAuth, createOrder)
orderRouter.get('/receipt/:orderIdentifier' , getOrderReceipt)

// CUSTOMER ORDER HISTORY
orderRouter.get('/customer/my-orders', requireAuth, getCustomerOrder)

// MERCHANTS ORDER
orderRouter.get('/merchant', requireAuth, requireRole(['merchant']), getMerchantOrders)
orderRouter.patch('/merchant/:id/status', requireAuth, requireRole(['merchant']), updateOrderStatus)





export default orderRouter;