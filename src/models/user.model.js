import mongoose, { Mongoose } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
            index: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
        },

        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        avatar: {
            type: String,
            required: true,
        },

        avatarId: {
            type: String,
            required: true,
        },

        coverImage: {
            type: String,
        },

        coverImageId: {
            type: String,
        },

        watchHistory: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Video",
            },
        ],

        password: {
            type: String,
            required: [true, "Password is required"],
        },

        refreshToken: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// PRE hook: runs before saving user / these hooks are also called Middlewares
// we wont use arrow function here as the callback function because we do not have access of "this" context in arrow function

/* These process are time taking process that is why we made the function as {'async'} 
    and these mongoose middlewares expects  (next) in callback fn parameter.
*/
userSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

// Post Hook (After Saving)
userSchema.post("save", function (doc) {
    console.log("New user created:", doc.username);
});

// adding new functions in userSchema through methods (here also we will not use arrow function as the callback for same reason)
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = mongoose.model("User", userSchema);
