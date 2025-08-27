export const sendResponse = (res, statusCode, success, message, data = null, error = null) => {
  res.status(statusCode).json({
    success,
    message,
    data,
    error
  });
};
