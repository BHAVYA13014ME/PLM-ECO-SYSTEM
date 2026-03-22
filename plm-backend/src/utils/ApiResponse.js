/**
 * ApiResponse — Standardized API response helper.
 *
 * Usage:
 *   new ApiResponse(res, 200, 'Products fetched', products);
 *   new ApiResponse(res, 201, 'Product created', product);
 *
 * On instantiation, immediately sends the JSON response.
 * All responses follow the envelope: { success, message, data }
 */
class ApiResponse {
  constructor(res, statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;

    res.status(statusCode).json({
      success: statusCode < 400,
      message,
      data,
    });
  }
}

module.exports = ApiResponse;
