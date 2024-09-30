import cloudinary from "../lib/cloudinary.js"
import { redis } from "../lib/redis.js"
import Product from "../models/product.model.js"

export const getAllProducts = async(req,res) => {
    try {
        const products = await Product.find({})
        res.json({products})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message:"Unexpected error occured while getting all products",
            error:error.message  
        })
    }
}

export const getFeaturedProducts = async(req,res) => {
    try {
        let featuredProducts = await redis.get('featured_products')
        if(featuredProducts)
            return res.json(JSON.parse(featuredProducts))
        
        featuredProducts = await Product.find({isFeatured:true}).lean()
        //lean() returns ajs object instead of mongodb object which is good for performance

        if(!featuredProducts)
            return res.status(404).json({
                message:"No featured products found"
            })
        
        await redis.set("featured_products",JSON.stringify(featuredProducts))
        res.json(featuredProducts)
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message:"Unexpected error occured while getting featured products",
            error:error.message  
        })
    }
}

export const createProduct = async(req,res) => {
    try {
        const {name,description,price,image,category} = req.body
        let cloudinaryResponse = null
        if(image) {
            cloudinaryResponse = await cloudinary.uploader.upload(image,{folder:'products'})
        }

        const product = await Product.create({
            name,description,price,
            image:cloudinaryResponse?.secure_url || '',
            category
        })

        res.status(201).json(product)
        
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message:"Unexpected error occured while creating products",
            error:error.message  
        })
    }
}

export const deleteProduct = async(req,res) => {
    try {
        const product = await Product.findById(req.params.id)
        if(!product) return res.status(404).json({
            message:"Product not found"
        })

        if(product.image) {
            const publicId = product.image.split('/').pop().split(".")[0]
            try {
                await cloudinary.uploader.destroy(`products/${publicId}`)
                console.log("deleted img from cloudinary")
            } catch (error) {
                console.log("Error deleting img from cloudinary",error.message)
            }

        }

        await Product.findByIdAndDelete(req.params.id)
        res.json({message:"Product deleted successfully"})
    } catch (error) {
        console.log(error.message)
        res.status(500).json({
            message:"Unexpected error occured while deleting product",
            error:error.message  
        })
    }
}