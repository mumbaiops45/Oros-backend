import mongoose from "mongoose";
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 10000
        }
        );
        console.log("✅ mongoDB connected");
    } catch(error) {
        console.error("❌ mongoDB connection failed :",error.message);
        process.exit(1);

    }


};
export default connectDB;