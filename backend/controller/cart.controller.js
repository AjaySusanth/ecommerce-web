import Product from "../models/product.model.js"

export const addToCart = async(req,res) => {
    try {
        const {productId} = req.body
        const user = req.user

        const existingItem = user.cartItems.find((item)=> item.id === productId)

        if(existingItem)
            existingItem.quantity +=1
        else
            user.cartItems.push(productId)
        await user.save();
        res.json(user.cartItems)

    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Error in add to cart",error:error.message})
    }
}

export const removeAllFromCart = async(req,res) => {
    try {
        const {productId} = req.body
        const user = req.user

        if(!productId)
            user.cartItems = []
        else 
            user.cartItems.filter((item)=>item.id !== productId )
        await user.save()
        res.json(user.cartItems)
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Error in removing all from cart",error:error.message})
    }
}

export const updateQuantity = async(req,res) => {
    try {
        const {id:productId} = req.params
        const quantity = req.body
        const user = req.user

        const existingItem = user.cartItems.find((item)=>item.id === productId)

        if(!existingItem)
            return res.status(404).json({message:"Product not found"})
        
        if(quantity === 0 ) {
            user.cartItems = user.cartItems.filter((item)=>item.id !== productId)
            await user.save()
            return res.json(user.cartItems)
        }
        else {
            existingItem.quantity = quantity
            await user.save()
            return res.json(user.cartItems)
        }

    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Error in updating quantity of product",error:error.message})
    }
}

export const getCartProducts = async(req,res) => {
    try {
        const products = await Product.find({_id:{$in:req.user.cartItems}})
        const cartItems = products.map((product)=> {
            const item = req.user.cartItems.find((cartItem)=> cartItem.id === product.id)
            return {...products.toJSON(),quantity:item.quatnity}
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({message:"Error in getting cart products",error:error.message})
    }
}