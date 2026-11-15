'use strict';

/**
 * Standard API response helpers.
 * Every controller should use these to maintain a consistent response envelope:
 *   { success: boolean, message: string, data: any }
 */

/**
 * Send a 200 OK success response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {string} [options.message]
 * @param {any}    [options.data]
 * @param {number} [options.statusCode]
 */
const sendSuccess = (res, { message = 'Success', data = null, statusCode = 200 } = {}) => {
  return res.status(statusCode).json({ success: true, message, data });
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object} options
 * @param {string} [options.message]
 * @param {number} [options.statusCode]
 * @param {any}    [options.data]
 */
const sendError = (res, { message = 'An error occurred', statusCode = 500, data = null } = {}) => {
  return res.status(statusCode).json({ success: false, message, data });
};

module.exports = { sendSuccess, sendError };
