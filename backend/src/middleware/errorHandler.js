const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  if (process.env.NODE_ENV !== 'production') {
    console.error('ERROR:', err);
    require('fs').appendFileSync('C:\\Users\\hp\\.gemini\\antigravity\\brain\\db84a6d3-66f6-49d1-9940-14cc6d2b8b66\\scratch\\error.log', err.stack + '\\n\\n');
  }

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 422;
    message = err.errors.map(e => e.message).join(', ');
  }

  // Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = `${err.errors[0].path} already exists`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large. Maximum size is 10MB';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = errorHandler;
