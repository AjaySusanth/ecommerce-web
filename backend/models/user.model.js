import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = mongoose.Schema({
    name:{
        type:String,
        required:[true,"Name is required"]
    },
    email:{
        type:String,
        required:[true,"Email is required"],
        lowercase:true,
        unique:true,
        trim:true
    },
    password:{
        type:String,
        required:[true,"Password is required"],
        minlength:[6,"Password must be 6 characters long"]
    },
    cartItems:[
        {
            quantity:{
                type:String,
                default:1
            },
            product:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Product"
            }
        }
    ],
    role:{
        tyoe:String,
        enum:["customer","admin"],
        default:"customer"
    }
},{timestamps:true})

const User = mongoose.model("User",userSchema)

//Pre save function to hash password
userSchema.pre('save',async function(next) {
    if(!this.isModiified("password")) return next()
    
    try {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password,salt)
        next()
    } catch (error) {
        next(error)
    }
})
// Method to compare passwords
userSchema.methods.comparePassword = async(password) => {
    return bcrypt.compare(password,this.password)
}

export default User