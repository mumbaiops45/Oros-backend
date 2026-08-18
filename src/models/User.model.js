import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({

    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required:true,
        trim: true
    },
    email: {
        type: String,
        lowercase: true,
        required:true,
        trim: true
    },
    role: {
        type: String,
        enum: ["user", "staff","admin"],
        default: "user"
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
   lastLoginAt:{
        type:Date,
        default:null
    }
},
    {
        timestamps: true
    }
);

export default mongoose.models.User || mongoose.model("User", UserSchema)