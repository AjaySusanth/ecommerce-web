import express from "express";
import { adminRoute, protectRoute } from "../../middleware/auth.middleware.js";
import { getAnalyticsData } from "../controller/analytics.controller.js";

const router = express.Router()

router.get("/",protectRoute,adminRoute,async(req,res)=> {
    try {
        const analyticsData = await getAnalyticsData()
        const endDate = new Date()
        const startDate = new Date(endDate.getTime() - 7*24*60*60*1000)
        const dailySalesData = await getDailySalesData(startDate,endDate)
        res.json({
            analyticsData,
            dailySalesData
        })
    } catch (error) {
        console.error("Error in getting analytics data",error.Date)
        res.status(500).json({
            message:"Error in getting analytics data",
            error:error.message
        })
    }
})

export default router
