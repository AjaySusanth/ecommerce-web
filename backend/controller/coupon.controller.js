import Coupon from "../models/coupon.model.js"

export const getCoupon = async(req,res) =>{
    try {
        const coupon = await Coupon.findOne({userId:req.user._id,isActive:true})
        res.json(coupon || null)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message:'Error in getting coupon',
            error:error.message
        })
    }
}

export const validateCoupon = async(req,res) => {
    try {
        const {code} = req.body
        const coupon = await Coupon.findOne({userId:req.user._id,code:code,isActive:true})

        if(!coupon)
            return res.status(404).json({
                message:"Coupon not found, invalid code"
            })
        
        if(coupon.expirationDate < new Date()) {
            coupon.isActive = false
            await coupon.save()
            return res.status(409).json({
                message:'Coupon expired'
            })
        }

        res.json({
            message:"Coupon valid",
            discount: coupon.discountPercentage
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message:'Error in validating coupon',
            error:error.message
        })
    }
}