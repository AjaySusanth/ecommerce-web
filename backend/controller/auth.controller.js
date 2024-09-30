import { redis } from "../lib/redis.js"
import User from "../models/user.model.js"
import jwt from 'jsonwebtoken'

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
        res.status(500).json({
            message:"Unexpected error occured while sign up",
            error:error.message
        })
    }
}

export const login = async (req,res)=>{
    try {
        const {email,password} = req.body
        const user = await User.findOne({email})
        if(!user) return res.status(404).json({
            message:"User not found,Please Sign in"
        })

        const isPasswordCorrect = await user.comparePassword(password)
        if(!isPasswordCorrect) return res.status(401).json({
            message:"Incorrect password"
        });

        const {accessToken,refreshToken} = generateToken(user._id)
        await storeRefreshToken(user._id,refreshToken)
        setCookies(res,refreshToken,accessToken)

        res.status(201).json({
            message:"Login successful",
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message:"Unexpected error occured while logging in",
            error:error.message
        })
    }
}

export const logout = async (req,res)=>{
    try {
        const refreshToken = req.cookies.refreshToken
        if(refreshToken) {
            const decoded = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)
            await redis.del(`refresh_token:${decoded.userId}`)
        }
    
        res.clearCookie('accessToken')
        res.clearCookie('refreshToken')
        res.json({message:"Logout successful"})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message:"Unexpected error occured",
            error:error.message
        })
    }
}

export const refreshToken = async(req,res)=> {
    
    try {
        const refreshToken = req.cookies.refreshToken
        if(!refreshToken) return res.json({message:"No refresh token"})
        const decoded = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET)
        const storedRefreshToken = await redis.get(`refresh_token:${decoded.userId}`)

        if(storedRefreshToken!==refreshToken) res.status(401).json({
            message:"Invalid refresh token"
        })

        const accessToken = jwt.sign({userId:decoded.userId},process.env.ACCESS_TOKEN_SECRET, {expiresIn:'15m'})

        res.cookie("accessToken",accessToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV === 'production',
            sameSite:'strict',
            maxAge:15*60*1000
        })
        res.status(200).json({
            accessToken,
            message:"access token refreshed"
        })
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message:"Unexpected error occured while refreshing token",
            error:error.message
        })
    }
}