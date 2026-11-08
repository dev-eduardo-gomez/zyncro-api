export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';

export const PROBLEM_TYPE_BASE_URI = 'https://cobrix.io/errors';

// RFC 9457 section 4.2.1: the default type when the problem has no semantics
// beyond its HTTP status code.
export const DEFAULT_PROBLEM_TYPE = 'about:blank';

// What went wrong, independent of the request it happened on.
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  [extension: string]: unknown;
}

export interface ProblemDetails extends Problem {
  instance: string;
  timestamp: string;
}
