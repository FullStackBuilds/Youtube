import { Router } from "express";
import {
    loginUser,
    registerUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatarImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1,
        },
        {
            name: "coverImage",
            maxCount: 1,
        },
    ]),
    registerUser
);
router.route("/login").post(loginUser);

// secured routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJwt, changePassword);
router.route("/get-current-user").post(verifyJwt, getCurrentUser);
router.route("/update-account").post(verifyJwt, updateAccountDetails);
router
    .route("/update-cover-image")
    .post(verifyJwt, upload.single("avatar"), updateAvatarImage);

export default router;
