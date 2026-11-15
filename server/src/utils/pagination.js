'use strict';

/**
 * Pagination helper.
 * Parses page/limit from query string and returns Prisma-compatible skip/take.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination query parameters.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number, take: number }}
 */
const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
};

/**
 * Build a standard paginated response payload.
 * @param {any[]}  items      - Page of results
 * @param {number} total      - Total count across all pages
 * @param {number} page       - Current page
 * @param {number} limit      - Page size
 */
const paginationMeta = (items, total, page, limit) => ({
  items,
  meta: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  },
});

module.exports = { parsePagination, paginationMeta };
