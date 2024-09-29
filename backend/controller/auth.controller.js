import { redis } from "../lib/redis.js"
import User from "../models/user.model.js"
import jwt from 'jsonwebtoken'
// import dotenv from 'dotenv'
// dotenv.config()
const generateToken = (userId) => {
    const accessToken = jwt.sign({userId},process.env.ACCESS_TOKEN_SECRET,{
        expiresIn:'15m'
    })
    const refreshToken = jwt.sign({userId},process.env.REFRESH_TOKEN_SECRET,{
        expiresIn:'7d'
    })

    return {accessToken,refreshToken}
}

const storeRefreshToken = async(userId,refreshToken) => {
    await redis.set(`refresh_token:${userId}`,refreshToken,"EX",7*24*60*60)//7days
}

const setCookies = (res,refreshToken,accessToken) => {
    res.cookie("accessToken",accessToken,{
        httpOnly:true, // prevents XSS attack
        secure:process.env.NODE_ENV === 'production',
        sameSite:"strict",// prevents CSRF attack
        maxAge:15*60*1000 //15 min
    })

    res.cookie("refreshToken",refreshToken,{
        httpOnly:true, // prevents XSS attack
        secure:process.env.NODE_ENV === 'production',
        sameSite:"strict",// prevents CSRF attack
        maxAge:7*24*60*60*1000 //7 days
    })
}

export const signup = async (req,res)=>{
    const {name,email,password} = req.body
    try {
        const userExisting = await User.findOne({email})

        if(userExisting) return res.status(400).json({message:"User already exists, Please Login"});

        const user = await User.create({name,email,password})
        const {accessToken,refreshToken} = generateToken(user._id)
        await storeRefreshToken(user._id,refreshToken)
        setCookies(res,refreshToken,accessToken)

        res.status(201).json({
            message:"User created successfully",
            user:{
                ...user._doc,
                password:undefined
            }
        })
        
    } catch (error) {
        console.log(error)
        res.status(500).json({message:error.message || "Unexpected error occeured"})
    }
}

export const login = async (req,res)=>{
    res.send("login route")
}

export const logout = async (req,res)=>{
    res.send("logout route")
}