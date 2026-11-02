import { extname, win32 } from 'node:path';
import { HttpError } from '../utils/http-error.js';

const DEFAULT_LIMITS = {
  maxFileBytes: 5 * 1024 * 1024,
  maxTotalFileBytes: 12 * 1024 * 1024,
};
const SOURCE_EXTENSIONS = new Set([
  '.bash', '.c', '.cc', '.cjs', '.cpp', '.cs', '.css', '.cts', '.cxx', '.dart', '.go',
  '.h', '.hpp', '.htm', '.html', '.hxx', '.java', '.js', '.jsx', '.kt', '.kts', '.lua', '.m',
  '.mm', '.mts', '.mjs', '.php', '.pl', '.pm', '.ps1', '.py', '.pyi',
  '.rb', '.rs', '.scala', '.sc', '.sh', '.sql', '.swift', '.ts', '.tsx', '.vue',
  '.svelte', '.zsh',
]);
const DOCUMENTATION_EXTENSIONS = new Set([
  '.adoc', '.asciidoc', '.markdown', '.md', '.mdx', '.org', '.rst', '.txt',
]);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readLimit(environmentName, defaultValue) {
  const value = process.env[environmentName];
  if (value === undefined || value === '') return defaultValue;
  const parsedValue = Number(value);
  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    throw new Error(`${environmentName} must be a positive safe integer.`);
  }
  return parsedValue;
}

export function getProjectInputLimits() {
  return {
    maxFileBytes: readLimit('PROJECT_MAX_FILE_BYTES', DEFAULT_LIMITS.maxFileBytes),
    maxTotalFileBytes: readLimit('PROJECT_MAX_TOTAL_FILE_BYTES', DEFAULT_LIMITS.maxTotalFileBytes),
  };
}

function validateProjectPath(filePath, index) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new HttpError(400, 'INVALID_FILE_PATH', `File at index ${index} must have a non-empty path.`);
  }

  const pathSegments = filePath.split('/');
  const isUnsafe = filePath.startsWith('/')
    || win32.isAbsolute(filePath)
    || /^[a-zA-Z]:/.test(filePath)
    || filePath.includes('\\')
    || filePath.includes(':')
    || /[\u0000-\u001f\u007f]/.test(filePath)
    || pathSegments.some((segment) => segment === '' || segment === '.' || segment === '..');

  if (isUnsafe) {
    throw new HttpError(400, 'UNSAFE_FILE_PATH', `File path "${filePath}" is not a safe relative path.`);
  }

  return filePath;
}

function classifyFile(filePath) {
  const extension = extname(filePath).toLowerCase();

  if (SOURCE_EXTENSIONS.has(extension)) {
    return 'source';
  }

  const fileName = filePath.split('/').at(-1);
  if (
    DOCUMENTATION_EXTENSIONS.has(extension)
    || /^readme(?:\..*)?$/i.test(fileName)
  ) {
    return 'documentation';
  }

  return 'other';
}

export function processProjectInput(input, { limits = getProjectInputLimits() } = {}) {
  if (!isRecord(input) || !isRecord(input.project)) {
    throw new HttpError(400, 'INVALID_PROJECT', 'Request body must contain a project object.');
  }

  const { name, files } = input.project;
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new HttpError(400, 'INVALID_PROJECT_NAME', 'Project name must be a non-empty string.');
  }

  if (!Array.isArray(files)) {
    throw new HttpError(400, 'INVALID_PROJECT_FILES', 'Project files must be an array.');
  }

  const seenPaths = new Set();
  let totalFileBytes = 0;
  const processedFiles = files.map((file, index) => {
    if (!isRecord(file)) {
      throw new HttpError(400, 'INVALID_FILE', `File at index ${index} must be an object.`);
    }

    const filePath = validateProjectPath(file.path, index);
    if (seenPaths.has(filePath)) {
      throw new HttpError(400, 'DUPLICATE_FILE_PATH', `Project contains duplicate file path "${filePath}".`);
    }
    seenPaths.add(filePath);

    if (typeof file.content !== 'string') {
      throw new HttpError(400, 'INVALID_FILE_CONTENT', `Content for "${filePath}" must be a string.`);
    }

    const fileBytes = Buffer.byteLength(file.content, 'utf8');
    if (fileBytes > limits.maxFileBytes) {
      throw new HttpError(
        413,
        'PROJECT_FILE_TOO_LARGE',
        `File "${filePath}" exceeds the ${limits.maxFileBytes}-byte project file limit.`,
      );
    }
    totalFileBytes += fileBytes;
    if (totalFileBytes > limits.maxTotalFileBytes) {
      throw new HttpError(
        413,
        'PROJECT_SIZE_LIMIT_EXCEEDED',
        `Project file contents exceed the ${limits.maxTotalFileBytes}-byte combined limit.`,
      );
    }

    return {
      path: filePath,
      content: file.content,
      category: classifyFile(filePath),
    };
  });

  return {
    project: {
      name,
      files: processedFiles,
    },
  };
}
