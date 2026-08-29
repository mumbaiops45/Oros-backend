import {createBannerService,getBannersService,updateBannerByIdService} from "../services/banner.service.js";

export const createBanner =async(req,res)=>{
 const bannerdata = req.body;
 if (req.files && req.files.mediaDesktop && req.files.mediaDesktop[0]) {
    bannerdata.mediaUrlDesktop=req.files.mediaDesktop[0].path;
   bannerdata.mediaUrlDesktopPublicId=req.files.mediaDesktop[0].filename
  
 }
 if ( req.files &&
        req.files.mediaMobile &&
        req.files.mediaMobile[0]) {
   bannerdata.mediaUrlMobile=req.files.mediaMobile[0].path;
   bannerdata.mediaUrlMobilePublicId=req.files.mediaMobile[0].filename
 }
 const {message,data}= await createBannerService(bannerdata);
 res.json({
    message,
    success:true,
    data
 })
}

export const updateBannerById =async(req,res)=>{
    const {id}=req.params;
    const bannerData=req.body;
    if (req.files?.mediaDesktop?.[0]) {
        bannerData.mediaUrlDesktop=req.files.mediaDesktop[0].path;
        bannerData.mediaUrlDesktopPublicId=req.files.mediaDesktop[0].filename
    }
     if ( req.files &&
        req.files.mediaMobile &&
        req.files.mediaMobile[0]) {
   bannerData.mediaUrlMobile=req.files.mediaMobile[0].path;
   bannerData.mediaUrlMobilePublicId=req.files.mediaMobile[0].filename
 }
    const {message,data}=await updateBannerByIdService(id,bannerData);
    res.json({
        message,success:true,
        data
    })
}

export const getBanners = async (req, res) => {
    const { message, data } = await getBannersService(req.query);
    res.json({
        message,
        success: true,
        data
    })
}
