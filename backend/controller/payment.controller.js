import { stripe } from "../lib/stripe.js";
import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";

export const createCheckoutSession = async(req,res) => {
    try {
        const {products,couponCode} = req.body;
        if(!Array.isArray(products) || products.length ===0)
            return res.status(400).json({
                message:"Invalid or empty products array"
            })
        
        let totalAmount = 0;
        const lineItems = products.map((product)=> {
            const amount = Math.round(product.price * 100) // stripe wants to send in the format of cents
            const totalAmount = amount * product.quantity;

            return {
                price_data:{
                    currency:'usd',
                    product_data:{
                        name:product.name,
                        images:[product.image]
                    },
                    unit_amount:amount
                },
                quantity:product.quantity || 1
            }
        })

        let coupon = null
        if(couponCode) {
            const coupon = Coupon.findOne({userId:req.user._id,code:couponCode,isActive:true})
            if(coupon) {
                totalAmount -= Math.round((totalAmount * coupon.discountPercentage) / 100) 
            }

        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
			line_items: lineItems,
			mode: "payment",
			success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
			discounts: coupon
            ? [
                {
                    coupon:await createStripeCoupon(coupon.discountPercentage)
                }
            ]
            : [],
            metadata: {
                userId :req.user._id.toString(),
                couponCode:couponCode || '',
                products:JSON.stringify(
                    products.map((product)=>({
                            id:product._id,
                            quantity:product.quantity,
                            price:product.price
                    }))
                )
            }
        })

        if(totalAmount >=20000)
            await createNewCoupon(req.user._id)

        res.status(200).json({id:session.id,totalAmount:totalAmount/100})

    } catch (error) {
        console.log(error)
        res.status(500).json({
            message:"Error in processing checkout",
            error:error.message
        })
    }
}

async function createStripeCoupon (discountPercentage) {
    const coupon = stripe.coupons.create({
        percent_off:discountPercentage,
        duration:"once"
    })
}

async function createNewCoupon(userId) {
    await Coupon.findOneAndDelete(userId)

    const newCoupon = new Coupon({
        userId:userId,
        code:"Gift"+Math.random().toString(36).substring(2,8).toUpperCase(),
        discountPercentage:10,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    })

    await newCoupon.save()
    return newCoupon
}

export const checkoutSuccess = async(req,res) => {
    try {
        const {sessionId} = req.body;

        const session =  await stripe.checkout.sessions.retrieve(sessionId)

        if(session.payment_status === 'paid') {
            // if coupon used, deactivate it
            if(session.metadata.couponCode) {
                await Coupon.findOneAndUpdate({
                    userId:req.user._id,
                    code:session.metadata.couponCode
                },{
                    isActive:false
                })
            }

            // create new order
            const products = JSON.parse(session.metadata.products)
            const newOrder = new Order({
                userId:req.user._id,
                products: products.map((product)=>({
                    id:product._id,
                    quantity:product.quantity,
                    price:product.price
                })),
                totalAmount: session.amount_total /100,
                stripeSessionId:sessionId
            })

            await newOrder.save();
            res.status(200).json({
                success:true,
                message:"Payment successfull and order created",
                orderId:newOrder._id
            })
        }
    } catch (error) {
        console.log("Error processing checkout success",error)
        res.status(500).json({
            message:"Error processing checkout success",
            error:error.message
        })   
    }
}