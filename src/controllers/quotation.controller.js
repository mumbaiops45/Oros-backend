import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    getObjectStore,
    isObjectStoreConfigured,
    OBJECT_STORE_BUCKET,
    MODEL_KEY_PREFIX
} from "../config/objectStore.js";
import { createQuotationService,updateQuotationService,updateQuotationByAdminService,getQuotationService } from "../services/quotation.service.js";

export const createQuotation=async(req,res)=>{

    const formData ={...req.body,files:req.files||[]};
const {message,data}= await  createQuotationService(req.user.id,formData);
res.json({
    success: true,
    message,
    data
});
}

// Customer update
export const updateQuotation = async (req, res) => {

    const { id } = req.params;

    const data = {
        ...req.body,
        files: req.files || []
    };

    const { message, data: result } =
        await updateQuotationService(
            id,
            req.user.id,
            data
        );

    res.json({
        success: true,
        message,
        data: result
    });
};


// Admin update
export const updateQuotationByAdmin = async (req, res) => {

    const { id } = req.params;

    const data = {
        ...req.body
    };

    const { message, data: result } =
        await updateQuotationByAdminService(
            id,
            data
        );

    res.json({
        success: true,
        message,
        data: result
    });
};

/*
Serves a 3D-model file that lives in the S3-compatible bucket. The
stored fileUrl points here; we presign the bucket object and redirect
so the bytes never pass through this server. Public on purpose - the
id is an unguessable UUID and the signed link lasts 5 minutes, the
same posture the old public Cloudinary URLs had.
*/
export const downloadQuotationFile = async (req, res) => {

    if (!isObjectStoreConfigured) {
        return res
            .status(404)
            .json({ success: false, message: "File not found" });
    }

    const { id } = req.params;

    // id is "<uuid>.<ext>" - reject anything with path separators etc.
    if (!/^[a-z0-9-]+\.[a-z0-9]+$/i.test(id)) {
        return res
            .status(400)
            .json({ success: false, message: "Invalid file id" });
    }

    const wantsDownload = req.query.download === "1";
    const name =
        typeof req.query.name === "string" && req.query.name
            ? req.query.name.replace(/[\r\n"]/g, "")
            : id;

    const url = await getSignedUrl(
        getObjectStore(),
        new GetObjectCommand({
            Bucket: OBJECT_STORE_BUCKET,
            Key: `${MODEL_KEY_PREFIX}${id}`,
            ResponseContentDisposition: wantsDownload
                ? `attachment; filename="${name}"`
                : "inline"
        }),
        { expiresIn: 300 }
    );

    res.redirect(url);
};

export const getQuotation=async(req,res)=>{
    const {message,data} = await getQuotationService(req.user,req.query);
    res.json({
        message,
        success:true,
        data

    })

}

