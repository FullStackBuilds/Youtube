import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import mongoose from "mongoose";

export const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: toggle subscription

    // if isSubscribed is true then false and vice versa
});

// controller to return subscriber list of a channel
export const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    try {
        const { channelId } = req.params;
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
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Error in fetching subscriber list of channel"
        );
    }
});

// controller to return channel list to which user has subscribed
export const getSubscribedChannels = asyncHandler(async (req, res) => {
    try {
        const { subscriberId } = req.params;

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
                    new ApiResponse(
                        200,
                        {},
                        "User has not subscribed any channel"
                    )
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
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Error in fetching User subscriptions"
        );
    }
});
