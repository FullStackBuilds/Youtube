import dotenv from "dotenv";
dotenv.config();

import { app } from "./app.js";
import { connectDB } from "./db/index.js";


console.log("PORT : ", process.env.PORT);
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
