const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  error.message = err.message;

  // Log to console: full error in dev, concise log in production
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  } else {
    console.error(`[ERROR] ${err.name || 'Error'}: ${err.message}`);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new ErrorResponse(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ErrorResponse(message, 400);
  }

  // Multer error handling
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error = new ErrorResponse('File size exceeds the allowed limit (max 25MB)', 400);
    } else {
      error = new ErrorResponse(err.message, 400);
    }
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ErrorResponse(message, 400);
  }

  const statusCode = error.statusCode || 500;
  // In production, mask unexpected 500 internal errors to prevent information disclosure
  let clientMessage = error.message;
  if (statusCode === 500 && process.env.NODE_ENV === 'production' && !(err instanceof ErrorResponse)) {
    clientMessage = 'An internal server error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    error: clientMessage || 'Server Error'
  });
};

module.exports = errorHandler;
