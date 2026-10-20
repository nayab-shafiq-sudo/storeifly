import { Router } from "express";
import { createCategories, deleteCategories, getCategories } from "../controller/categoryController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
const CategoryRouter = Router()




// PUBLIC / CUSTOMER CAN VIEW CATEGORIES
CategoryRouter.get('/', getCategories)

// MERCHANT CAN MANAGE CATEGORIES
CategoryRouter.post('/', requireAuth, requireRole(['merchant']), createCategories)
CategoryRouter.delete('/:id', requireAuth, requireRole(['merchant']), deleteCategories)




export default CategoryRouter;