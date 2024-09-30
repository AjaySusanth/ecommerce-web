import express from "express";
import { createProduct, deleteProduct, getAllProducts, getFeaturedProducts } from "../controller/product.controller.js";
import { adminRoute, protectRoute } from "../../middleware/auth.middleware.js";

const router = express.Router()

router.get('/',protectRoute,adminRoute,getAllProducts)
router.post('/',protectRoute,adminRoute,createProduct)
router.delete('/:id',protectRoute,adminRoute,deleteProduct)
router.get('/featured',getFeaturedProducts)
export default router