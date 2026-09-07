import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["SLIDER", "SHOWREEL"],
            required: true
        },
        kicker: {
            type: String,
            default: ""
        },
        title1: {
            type: String,
            default: ""
        },

        title1Color: {
            type: String,
            default: "#2b1b4d"
        },

        title2: {
            type: String,
            default: ""
        },

        title2Color: {
            type: String,
            default: "#ff5a2c"
        },

        subTitle: {
            type: String,
            default: ""
        },

        subTitleColor: {
            type: String,
            default: "#2b1b4d"
        },

        ctaLabel: {
            type: String,
            default: ""
        },
        ctaUrl: {
            type: String,
            default: ""
        },
        tone: {
            type: String,
            enum: ["LIGHT", "DARK"],
            default: "LIGHT"
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