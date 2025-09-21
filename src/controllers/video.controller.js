import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
    uploadVideoOnCloudinary,
    deleteVideoOnCloudinary,
    uploadOnCloudinary,
    deleteOnCloudinary,
} from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";

export const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination
});

export const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const user = req?.user;

        const { title, description } = req.body;
        if (!title || !description) {
            throw new ApiError(400, "title and description are required");
        }

        // TODO: get video, upload to cloudinary, create video
        let videoLocalPath = null;
        if (
            req.files &&
            Array.isArray(req.files.video) &&
            req.files.video.length > 0
        ) {
            videoLocalPath = req.files.video[0].path;
        }

        let thumbnailLocalPath = null;
        if (
            req.files &&
            Array.isArray(req.files.thumbnail) &&
            req.files.thumbnail.length > 0
        ) {
            thumbnailLocalPath = req.files.thumbnail[0].path;
        }

        if (!videoLocalPath) {
            throw new ApiError(400, "Video file is required");
        }

        if (!thumbnailLocalPath) {
            throw new ApiError(400, "Video thumbnail is required");
        }

        // upload video and thumbnail on cloudinary
        const video = await uploadVideoOnCloudinary(videoLocalPath);
        if (!video) {
            throw new ApiError(400, "Failed video upload on cloudinary");
        }

        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if (!thumbnail) {
            throw new ApiError(400, "Failed thumbnail upload on cloudinary");
        }

        const videoUrl = video?.secure_url;
        const videoId = video?.public_id;
        const videoDuration = video?.duration;

        const thumbnailUrl = thumbnail?.url;
        const thumbnailId = thumbnail?.public_id;

        const newVideo = await Video.create({
            videoFile: videoUrl,
            videoFileId: videoId,
            thumbnail: thumbnailUrl,
            thumbnailId: thumbnailId,
            title: title,
            description: description,
            duration: videoDuration,
            views: 0,
            owner: new mongoose.Types.ObjectId(user?._id),
        });

        const publishedVideo = await Video.findById(newVideo?._id);

        if (!publishedVideo) {
            throw new ApiError(
                500,
                "Something went wrong while storing video in DB"
            );
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    publishedVideo,
                    "Video published successfully"
                )
            );
    } catch (error) {
        throw new ApiError(500, error?.message || "Error in publishing Video");
    }
});

export const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        //TODO: get video by id

        if (!videoId) {
            throw new ApiError(400, "Video Id is required to fetch video");
        }

        const video = await Video.aggregate([
            { $match: { videoFileId: videoId } },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "videoOwner",
                    pipeline: [
                        { $project: { username: 1, fullname: 1, email: 1 } },
                    ],
                },
            },
            {
                $project: {
                    _id: 0,
                    videoOwner: 1,
                    videoFileId: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    thumbnailId: 0,
                    title: 1,
                    description: 1,
                    duration: 1,
                    views: 1,
                },
            },
        ]);

        if (!video || video.length === 0) {
            throw new ApiError(
                400,
                `No video is available with video id: ${videoId}`
            );
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    300,
                    video[0],
                    "Fetched video by id successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || `Error while fetching video with id: ${videoId}`
        );
    }
});

export const updateVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        //TODO: update video details like title, description, thumbnail

        const { title, description } = req.body;

        const newThumbnailLocalPath = req?.file?.path;

        if (!title || !description) {
            throw new ApiError(400, "title and description are required");
        }

        const video = await Video.findOne({ videoFileId: videoId });
        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        let newThumbnail;

        if (newThumbnailLocalPath) {
            newThumbnail = await uploadOnCloudinary(newThumbnailLocalPath);
            if (!newThumbnail) {
                throw new ApiError(
                    400,
                    "Failed thumbnail upload on cloudinary"
                );
            }
            // delete old thumbnail
            const deletedOldThumbnail = await deleteOnCloudinary(
                video?.thumbnailId
            );
            if (!deletedOldThumbnail) {
                throw new ApiError(400, "old thumbnail failed to delete");
            }
        }

        // remember changes will not propagate to the database untill you save it
        video.title = title;
        video.description = description;

        if (newThumbnail) {
            video.thumbnail = newThumbnail?.url;
            video.thumbnailId = newThumbnail?.public_id;
        }

        await video.save({ validateBeforeSave: false });

        return res
            .status(200)
            .json(new ApiResponse(200, video, " Video updated Successfully"));
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || " Error while updating Video"
        );
    }
});

export const deleteVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        //TODO: delete video

        const video = await Video.findOne({ videoFileId: videoId });

        if (!video) {
            throw new ApiError(404, "Video does not exist");
        }

        const deleteVideoCloudinary = await deleteVideoOnCloudinary(
            video?.videoFileId
        );

        if (!deleteVideoCloudinary || deleteVideoCloudinary.result !== "ok") {
            throw new ApiError(
                500,
                "Failed to delete video on cloudinary while deleting video"
            );
        }
        const deleteThumbnail = await deleteOnCloudinary(video?.thumbnailId);
        if (!deleteThumbnail || deleteThumbnail.result !== "ok") {
            throw new ApiError(
                500,
                "Failed to delete thumbnail on cloudinary while deleting video"
            );
        }

        const deletedVideo = await Video.findOneAndDelete({
            videoFileId: videoId,
        });

        if (!deletedVideo) {
            throw new ApiError(
                500,
                "Something went wrong while deleting video from DB"
            );
        }

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Successfully deleted video"));
    } catch (error) {
        throw new ApiError(
            500,
            error?.message || "Error while deleting video on cloudinary"
        );
    }
});

export const togglePublishStatus = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;

        const video = await findOne({ videoFileId: videoId });
        if (!video) {
            throw new ApiError(404, "Video not found");
        }

        video.isPublished = !video.isPublished;
        await video.save({ validateBeforeSave: false });
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    video,
                    "Successfully toggled publish status"
                )
            );
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Error while toggling publish status"
        );
    }
});
