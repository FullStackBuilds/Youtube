import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./db/index.js";

dotenv.config({
    path: "./.env",
});

export const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

// Setting initial express configuration

// recieve json data into backend
// with limit of 16kb data only
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser()); // able to do CRUD operations on cookies in client's browser

connectDB()
    .then((res) => {
        app.on("error", (error) => {
            console.log("EXPRESS APP ERROR: ", error);
        });
        app.listen(process.env.PORT || 8000, () => {
            console.log("SERVER STARTED at PORT : ", process.env.PORT);
        });
    })
    .catch((error) => {
        console.log("MONGODB CONNECTION FAILED !!", error);
    });
