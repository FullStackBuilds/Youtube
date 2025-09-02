import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
    const coverImageLocalPath = req.files?.coverImage[0]?.path; // path of image stored locally on the server

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
        coverImage: coverImage?.url || "",
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

export const loginUser = asyncHandler(async (req, res, next) => {
    res.status(200).json({ message: "User logged in successfully" });
});
