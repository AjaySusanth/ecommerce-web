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