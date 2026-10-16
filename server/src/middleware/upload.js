const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const ErrorResponse = require('../utils/errorResponse');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.mp4', '.mov'];
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/quicktime',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  // Deny dangerous executable extensions
  const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.php', '.py', '.jar'];
  if (dangerousExtensions.includes(ext)) {
    return cb(new ErrorResponse('Dangerous file format not allowed', 400), false);
  }

  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mime)) {
    return cb(null, true);
  }

  cb(
    new ErrorResponse(
      `Unsupported file format (${ext || mime}). Allowed formats: JPG, PNG, PDF, MP4`,
      400
    ),
    false
  );
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video/');
    const isPdf = file.mimetype === 'application/pdf';
    const isDoc = isPdf || file.mimetype.includes('word') || file.mimetype === 'application/msword';

    if (isVideo) {
      return {
        folder: 'societyhub',
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov'],
      };
    }

    if (isDoc) {
      return {
        folder: 'societyhub',
        resource_type: 'raw',
      };
    }

    return {
      folder: 'societyhub',
      resource_type: 'image',
      allowed_formats: ['jpg', 'jpeg', 'png'],
    };
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

module.exports = upload;

