import multer from "multer";

// using disk storage and not memory storage because:-
// Files are saved temporarily to disk and safer for large files

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})

export const upload = multer({ 
    storage, 
})