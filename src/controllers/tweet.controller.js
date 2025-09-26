import { Tweet } from "../models/tweet.model.js";
import ApiError from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getUserTweets = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(404, "user id is required to fetch tweets");
    }

    // using this , makes sure that logged in user can see their tweets only
    const user = req?.user;

    const tweets = await Tweet.find({ owner: user._id });
    return res
        .status(200)
        .json(
            new ApiResponse(200, tweets, "Successfully fetched user's tweets")
        );
});

export const createTweet = asyncHandler(async (req, res) => {
    const user = req?.user;
    if (!user || !user._id) {
        throw new ApiError(401, "User not authenticated");
    }

    // const getUser = await User.findById(user?._id);

    const { content } = req?.body;
    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet cannot be empty");
    }

    // create a new tweet
    const tweet = await Tweet.create({
        content: content,
        owner: user?._id,
    });

    if (!tweet || !tweet._id) {
        throw new ApiError(500, "Failed to add tweet in DB");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Successfully added user tweet"));
});

export const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required to update tweet");
    }

    const { content } = req?.body;

    if (!content || !content.trim()) {
        throw new ApiError(400, "Tweet cannot be empty");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!updatedTweet) {
        throw new ApiError(500, "Failed to update tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedTweet, "Successfully updated tweet"));
});

export const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, "Tweet id is required to delete tweet");
    }

    const deleteTweet = await Tweet.findByIdAndDelete(tweetId);
    if (!deleteTweet) {
        throw new ApiError(500, "Failed to delete Tweet");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Successfully deleted tweet"));
});
