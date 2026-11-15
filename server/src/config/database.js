'use strict';

/**
 * Prisma Client singleton.
 * Import `prisma` from this module wherever DB access is needed.
 * Using a singleton avoids exhausting the connection pool in development
 * (where hot-reload would otherwise create a new PrismaClient per reload).
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['warn', 'error'],
});

module.exports = { prisma };
