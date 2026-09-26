import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient shared across all route handlers.
 * Prevents multiple connection pools which was causing OOM crashes
 * when the system is memory-constrained.
 */
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? [] : [],
});

export default prisma;
