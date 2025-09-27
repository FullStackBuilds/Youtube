import { Comment } from "../models/comment.model";
import ApiError from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
});

export const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(404, "Video id is required to add comment");
    }

    const { content } = req?.body;
    if (!content || content.trim() === "") {
        throw new ApiError(400, "comment cannot be empty for a video");
    }

    const newComment = await Comment.create({
        content,
        video: videoId,
        owner: req?.user?._id,
    });

    if (!newComment) {
        throw new ApiError(500, "Failed to add comment under video");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                newComment,
                "Successfully added comment under video"
            )
        );
});

export const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    if (!commentId) {
        throw new ApiError(404, "Comment id is required to update comment");
    }

    const { newContent } = req.body;
    if (!newContent || newContent.trim() === "") {
        throw new ApiError(400, "comment cannot be empty");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: newContent,
            },
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(500, "Failed to update comment");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Successfully updated comment")
        );
});

export const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;
    if (!commentId) {
        throw new ApiError(404, "Comment id is required to delete comment");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        return res
            .status(404)
            .json(new ApiResponse(404, {}, "Comment not found"));
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, deletedComment, "Successfully updated comment")
        );
});
