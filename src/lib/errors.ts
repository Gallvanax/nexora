import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status = 400,
    code = "BAD_REQUEST",
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentification requise.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Vous n'avez pas l'autorisation d'effectuer cette action.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Cette ressource existe déjà.") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds = 60, message = "Trop de tentatives. Réessayez plus tard.") {
    super(message, 429, "RATE_LIMITED", { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function handleApiError(error: unknown, contextEvent = "api.error"): NextResponse {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "root";
      fieldErrors[key] = fieldErrors[key] ?? [];
      fieldErrors[key].push(issue.message);
    }
    return NextResponse.json(
      {
        error: "Les données fournies sont invalides.",
        code: "VALIDATION_ERROR",
        fieldErrors,
      },
      { status: 400 }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        retryAfterSeconds: error.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(error.retryAfterSeconds),
        },
      }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
      },
      { status: error.status }
    );
  }

  logger.error(contextEvent, { error });
  return NextResponse.json(
    {
      error: "Une erreur interne est survenue. Veuillez réessayer.",
      code: "INTERNAL_ERROR",
    },
    { status: 500 }
  );
}
