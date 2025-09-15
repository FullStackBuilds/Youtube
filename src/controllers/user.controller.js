import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

export const registerUser = asyncHandler(async (req, res, next) => {
    const { username, fullname, email, password } = req.body;

    // validation
    if (
        [username, fullname, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        return new ApiError(400, "All fields are required");
    }

    // search user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // console.log("req.files : ", req.files);
    const avatarLocalPath = req.files?.avatar[0]?.path; // path of avatar stored locally on the server
    // const coverImageLocalPath = req.files?.coverImage[0]?.path; // path of image stored locally on the server

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    // upload avatar and coverImage to cloudinary service
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log("avatar : ", avatar);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // create user
    const user = await User.create({
        username: username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: avatar?.url,
        avatarId: avatar.public_id,
        coverImage: coverImage?.url || "",
        coverImageId: coverImage?.public_id || "",
    });

    // if (!user) {
    //     throw new ApiError(500, "User creation failed");
    // }

    // write those fields inside select prefixed with minus sign those you dont wanna add in the returned user
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    // craft a uniform response using ApiResponse class
    res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    );
});

export const generateAccessAndRefreshToken = async (user_Id) => {
    // make a db call

    try {
        const user = await User.findById(user_Id);

        // generate access token
        const accessToken = user.generateAccessToken();

        // generate refresh token
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken; // CAUTION: abhi changes database mei propagate nhi hue hain

        await user.save({ validateBeforeSave: false }); // this does not hash the pasword again on save event
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "Something went wrong while generating access token"
        );
    }
};

export const loginUser = asyncHandler(async (req, res, next) => {
    // req.body -> data
    // email is not empty
    // find the user
    // check password
    // access and refresh token
    // send cookie

    const { email, password } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    // find the user
    const user = await User.findOne({
        email,
    });

    if (!user) {
        throw new ApiError(400, "User is not registered");
    }

    // check password(those methods are used through the returned "user" var from findOne)
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    // set cookies
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged In Successfully"
            )
        );
});

export const logoutUser = asyncHandler(async (req, res, next) => {
    // clear cookies

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options);
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken =
            req?.cookies("refreshToken") || req.body.refreshToken;

        if (!incomingRefreshToken) {
            throw new ApiError(400, "Unauthorised request");
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        if (!decodedToken) {
            throw new ApiError(400, "Invalid refresh token");
        }

        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(400, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(400, "Refresh token expired");
        }

        // generate new access and refresh tokens
        const { newAccessToken, newRefreshToken } =
            await generateAccessAndRefreshToken(user?._id);

        const options = {
            httpOnly: true,
            secure: true,
        };

        // set token in cookies
        res.status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { refreshToken: newRefreshToken },
                    "refresh token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh Token");
    }
});

export const changePassword = asyncHandler(async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body; // include confirm new password field in frontend and check if both are same

        const user = await User.findById(req.user?._id);
        if (!user) {
            throw new ApiError(400, "Unauthorised Access");
        }

        // .methods functions are accessed through the object of User model
        const isPasswordValid = await user.isPasswordCorrect(oldPassword);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid password");
        }

        // save karo
        user.password = newPassword; // CAUTION: abhi changes database mei propagate nhi hue hain

        await user.save(); // pre hook will run will check if password is modified then hash the password

        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Password updated succesfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Error in changing password");
    }
});

export const getCurrentUser = asyncHandler(async (req, res) => {
    try {
        const user = req.user;

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { currentUser: user },
                    "Current user fetched successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Error in fetching current user"
        );
    }
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
    try {
        const { fullname, email } = req.body;

        if (!fullname || !email) {
            throw new ApiError(400, "Fullname and email are required");
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                fullname,
                email,
            },
            { new: true }
        ).select(" -password ");

        if (!user) {
            throw new ApiError(400, "Cannot update account details");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    user,
                    "Account details updated successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Error in updating account details"
        );
    }
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
    try {
        const newAvatarFileLocalPath = req.file?.path;
        if (!newAvatarFileLocalPath) {
            throw new ApiError(400, "avatar is required");
        }

        // upload new avatar on cloudinary
        const newAvatar = await uploadOnCloudinary(newAvatarFileLocalPath);

        if (!newAvatar) {
            throw new ApiError(400, "Cannot upload new avatar on cloudinary");
        }

        const user = await User.findById(req.user?._id);

        // delete old avatar
        const deletedOldAvatar = await deleteOnCloudinary(user?.avatarId);
        if (!deletedOldAvatar) {
            throw new ApiError(400, "Cannot delete old avatar");
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avatar: newAvatar?.url,
                    avatarId: newAvatar?.public_id,
                },
            },
            { new: true }
        ).select(" -password -refreshToken");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedUser,
                    "Avatar changed successfully "
                )
            );
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Error in changing the Avatar"
        );
    }
});

export const updateUserCoverImage = asyncHandler(async (req, res) => {
    try {
        const newCoverImageFileLocalPath = req.file?.path;
        if (!newCoverImageFileLocalPath) {
            throw new ApiError(400, "avatar is required");
        }

        // upload new avatar on cloudinary
        const newCoverImage = await uploadOnCloudinary(
            newCoverImageFileLocalPath
        );

        if (!newCoverImage) {
            throw new ApiError(
                400,
                "Cannot upload new cover image on cloudinary"
            );
        }

        const user = await User.findById(req.user?._id);

        // delete old cover image
        const deletedOldCoverImage = await deleteOnCloudinary(
            user?.coverImageId
        );
        if (!deletedOldCoverImage) {
            throw new ApiError(
                400,
                "Cannot delete old cover image on cloudinary"
            );
        }

        // user.avatar = newAvatar?.url;
        // user.avatarId = newAvatar?.public_id;

        // user.save({ validateBeforeSave: false });

        const updatedUser = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: newCoverImage?.url,
                    coverImageId: newCoverImage?.public_id,
                },
            },
            { new: true }
        ).select(" -password -refreshToken");

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    updatedUser,
                    "Cover image changed successfully "
                )
            );
    } catch (error) {
        throw new ApiError(
            400,
            error?.message || "Error in changing the Cover Image"
        );
    }
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
    
});
