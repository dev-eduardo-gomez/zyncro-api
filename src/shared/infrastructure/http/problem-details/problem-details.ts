export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';

export const PROBLEM_TYPE_BASE_URI = 'https://cobrix.io/errors';

// RFC 9457 section 4.2.1: the default type when the problem has no semantics
// beyond its HTTP status code.
export const DEFAULT_PROBLEM_TYPE = 'about:blank';

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  timestamp: string;
  [extension: string]: unknown;
}
