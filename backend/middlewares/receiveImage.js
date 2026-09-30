import multer from "multer"
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 4 * 1024 * 1024, // App limit: 4 MB
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Please upload a JPG, PNG, or WebP image."));
    }

    cb(null, true);
  },
});

export const receiveImage = (req, res, next) => {

    upload.single("image")(req, res, (err) => {

        if (err) {
            return res.status(400).json({
                msg: err.message
            })
        }

        next()
    })
}