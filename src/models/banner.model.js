import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["SLIDER", "SHOWREEL"],
            required: true
        },
        title:{
            type:String,
            default:""
        },
          subTitle:{
            type:String,
            default:""
        },
                ctaLabel:{
            type:String,
            default:""
        },
        ctaUrl:{
            type:String,
            default:""
        },


        mediaUrlDesktop: {
            type: String,
            required: true
        },

        mediaUrlDesktopPublicId: {
            type: String,
            required: true
        },

        mediaUrlMobile: {
            type: String,
            required: true
        },

        mediaUrlMobilePublicId: {
            type: String,
            required: true
        },

        order: {
            type: Number,
            default: 1
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);



export default mongoose.models.Banner ||
    mongoose.model("Banner", bannerSchema);