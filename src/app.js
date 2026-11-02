import { createServer } from 'node:http';
import { routeApiRequest } from './routes/api-routes.js';
import { HttpError } from './utils/http-error.js';
import { sendJson } from './utils/http-response.js';

const LOCAL_FRONTEND_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function getAllowedOrigins(options) {
  if (Array.isArray(options.corsOrigins)) {
    return new Set(options.corsOrigins);
  }

  const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (configuredOrigins !== undefined) {
    return new Set(configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean));
  }

  return process.env.NODE_ENV === 'production' ? new Set() : LOCAL_FRONTEND_ORIGINS;
}

function getRequestOrigin(request) {
  const forwardedProtocol = request.headers['x-forwarded-proto']?.split(',')[0]?.trim();
  const protocol = forwardedProtocol || (request.socket.encrypted ? 'https' : 'http');
  const host = request.headers.host;
  if (!host) return null;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

function isLoopbackDevelopmentOrigin(origin) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function isOriginAllowed(request, origin, options, allowedOrigins) {
  if (allowedOrigins.has(origin) || origin === getRequestOrigin(request)) {
    return true;
  }

  const hasExplicitPolicy = Array.isArray(options.corsOrigins)
    || process.env.CORS_ALLOWED_ORIGINS !== undefined
    || process.env.NODE_ENV === 'production';
  return !hasExplicitPolicy && isLoopbackDevelopmentOrigin(origin);
}

function applyCors(request, response, options) {
  const origin = request.headers.origin;
  const allowedOrigins = getAllowedOrigins(options);

  if (origin && !isOriginAllowed(request, origin, options, allowedOrigins)) {
    sendJson(response, 403, {
      error: {
        code: 'CORS_ORIGIN_NOT_ALLOWED',
        message: 'This origin is not allowed to access the API.',
      },
    });
    return false;
  }

  if (origin) {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return false;
  }

  return true;
}

async function handleRequest(request, response, options) {
  try {
    if (!applyCors(request, response, options)) {
      return;
    }

    const routeHandled = await routeApiRequest(request, response, options);

    if (!routeHandled) {
      sendJson(response, 404, {
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found.',
        },
      });
    }
  } catch (error) {
    const statusCode = error instanceof HttpError ? error.statusCode : 500;
    const code = error instanceof HttpError ? error.code : 'INTERNAL_SERVER_ERROR';
    const message = error instanceof HttpError ? error.message : 'Internal server error.';

    if (statusCode === 500) {
      console.error('Unhandled API request error:', error);
    }

    if (response.headersSent) {
      response.destroy(error);
      return;
    }

    sendJson(response, statusCode, { error: { code, message } });
  }
}

export function createApp(options = {}) {
  return createServer((request, response) => {
    void handleRequest(request, response, options);
  });
}
