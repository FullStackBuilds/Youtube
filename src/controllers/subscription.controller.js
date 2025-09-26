import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";


export const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!channelId) {
        throw new ApiError(
            404,
            "Channel id is required to toggle subscription"
        );
    }

    const user = req?.user;
    if (!user || !user._id) {
        throw new ApiError(401, "User not authenticated");
    }

    // Check if the user has already subscribed channel with id passed in url as params
    const subscription = await Subscription.findOne({
        channel: channelId,
        subscriber: user._id,
    });

    if (!subscription) {
        // Add subscription
        const addSubscription = await Subscription.create({
            channel: channelId,
            subscriber: user._id,
        });

        if (!addSubscription) {
            throw new ApiError(500, "Failed to add subscription");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    addSubscription,
                    "Subscription Added Successfully"
                )
            );
    }

    // Cancel subscription
    const cancelSubscription = await Subscription.findOneAndDelete({
        channel: channelId,
        subscriber: user._id,
    });

    if (!cancelSubscription) {
        throw new ApiError(500, "Failed to cancel subscription");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                cancelSubscription,
                "Successfully canceled subscription"
            )
        );
});

// controller to return subscriber list of a channel
export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!channelId) {
        throw new ApiError(
            404,
            "Channel id is required to fetch user's channel subscribers"
        );
    }

    const channelObjectId = new mongoose.Types.ObjectId(channelId);

    // we have to query channel field
    const result = await Subscription.aggregate([
        { $match: { channel: channelObjectId } },

        {
            $group: {
                _id: "$channel",
                subscribersIds: { $push: "$subscriber" },
                subscriberCount: { $sum: 1 },
            },
        },

        {
            $lookup: {
                from: "users",
                localField: "subscribersIds",
                foreignField: "_id",
                as: "subscribers",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullname: 1,
                            avatar: 1,
                            email: 1,
                        },
                    },
                ],
            },
        },

        // tidy up output
        {
            $project: {
                _id: 0,
                channelId: "$_id",
                subscriberCount: 1,
                subscribersIds: 1,
            },
        },
    ]);

    if (!result || result.length === 0) {
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Channel has 0 Subscribers"));
    }

    console.log("Fetched subscriber list of subscribers: ", result);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result[0],
                "Fetched subcribers of the channel successfully"
            )
        );
});

// controller to return channel list to which user has subscribed
export const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!subscriberId) {
        throw new ApiError(
            404,
            "Subscriber id is required to fetch user's subscribed channels "
        );
    }

    const subscriberObjectId = new mongoose.Types.ObjectId(subscriberId);

    const result = await Subscription.aggregate([
        { $match: { subscriber: subscriberObjectId } },
        {
            $group: {
                _id: "$subscriber",
                SubscribedToIds: { $push: "$channel" },
                subscibedToCount: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "SubscribedToIds",
                foreignField: "_id",
                as: "subscribedToChannelIds",
                pipeline: [
                    { $project: { username: 1, fullname: 1, avatar: 1 } },
                ],
            },
        },
        {
            $project: {
                _id: 0,
                subscibedToCount: 1,
                subscriber: "$_id",
                subscribedToChannelIds: 1,
            },
        },
    ]);

    if (!result || result.length === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "User has not subscribed any channel")
            );
    }

    console.log("User subscriptions fetched successfully: ", result);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                result[0],
                "User subscriptions fetched successfully"
            )
        );
});
