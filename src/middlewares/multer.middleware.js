import multer from "multer";

// Configure multer storage
// Set the destination and filename for uploaded files
// we use multer because it has access to file which we can directly store in the destination
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp");
    },
    filename: function (req, file, cb) {
        // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.originalname);
    },
});

export const upload = multer({
    storage
});

 /* multer.diskStorage → tells multer to store uploaded files on your server’s disk (not just in memory).

    destination → where to put the file → ./public/temp folder.

    filename → how to name the file → original file name + unique random suffix (so files don’t overwrite each other).

    upload → this is your multer middleware.

    When you use it in a route, e.g. app.post("/upload", upload.single("file"), (req,res)=>{}), it:

    Accepts the file from the user.

    Saves it to ./public/temp/ with the given naming rule.

    Adds file info in req.file (so you can read name, path, size, etc.).
*/