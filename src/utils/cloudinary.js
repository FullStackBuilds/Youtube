import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // comes built in with node js

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// reusable method(will be used for images , videos , audios etc) so put it in utils folder
// upload takes time so use async
export const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        console.log("File uploaded successfully :", response);
        // console.log("File uploaded successfully :", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        // if upload error then delete file locally saved on your server using file system module
        console.error("Error while uploading on cloudinary :", error);
        fs.unlinkSync(localFilePath);
        return null;
    }
};