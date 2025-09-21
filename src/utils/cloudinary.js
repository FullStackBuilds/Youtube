import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // comes built in with node js
import ApiError from "./ApiError.js";
import { AssertionError } from "assert";

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

export const uploadVideoOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "video",
            folder: "videos",
            chunk_size: 6000000,
        });

        console.log("Video File uploaded successfully :", response);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        // if upload error then delete file locally saved on your server using file system module
        console.error("Error while uploading on cloudinary :", error);
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
        return null;
    }
};

export const deleteOnCloudinary = async (fileId) => {
    try {
        if (!fileId) {
            throw new ApiError(
                400,
                "public_id is required to delete on cloudinary"
            );
        }
        const response = await cloudinary.uploader.destroy(fileId, {
            resource_type: "auto",
        });

        if (response) console.log("Avatar deleted Successfully : ", response);

        return response;
    } catch (error) {
        throw new ApiError(500, "Error in deleting file from cloudinary");
    }
};

export const deleteVideoOnCloudinary = async (fileId) => {
    try {
        if (!fileId) {
            throw new ApiError(
                400,
                "public_id is required to delete on cloudinary"
            );
        }
        const response = await cloudinary.uploader.destroy(fileId, {
            resource_type: "video",
        });

        if (response) console.log("Video deleted Successfully : ", response);

        return response;
    } catch (error) {
        throw new ApiError(500, "Error in deleting Video file from cloudinary");
    }
};
