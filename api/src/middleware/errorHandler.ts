import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, message: string, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan.`,
    },
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      ok: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload permintaan tidak valid.',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'Data duplikat terdeteksi pada kolom unik.',
        },
      });
      return;
    }

    if (err.code === 'P2025') {
      res.status(404).json({
        ok: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: 'Data yang diminta tidak ditemukan.',
        },
      });
      return;
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    res.status(503).json({
      ok: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'Database belum terhubung. Periksa konfigurasi DATABASE_URL.',
      },
    });
    return;
  }

  console.error('[API Error]', err);
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan internal pada server API.',
    },
  });
}
