import jwt from "jsonwebtoken"
import User from "../backend/models/user.model.js"

export const protectRoute = async(req,res,next) => {
    try {
        const accessToken = req.cookies.accessToken
        if(!accessToken) return res.status(401).json({message:"No access token provided"})

            try {
                const decoded = jwt.verify(accessToken,process.env.ACCESS_TOKEN_SECRET)

                const user = await User.findById(decoded.userId).select("-password")

                if(!user) return res.status(404).json({message:"User not found"})
                
                req.user = user
                next()

            } catch (error) {
                if(error.name === 'TokenExpiredError')
                    return res.status(401).json({message:"Access token expired"})

                throw error
            }
    } catch (error) {
        res.status(500).json({
            message:"Unexpected error occured in auth middleware",
            error:error.message  
        })

    }
}

export const adminRoute = async(req,res,next) => {
    if(req.user && req.user.role ==='admin')
        next()
    else
        return res.status(403).json({
    message:"Access Denied, Admins only"})
}