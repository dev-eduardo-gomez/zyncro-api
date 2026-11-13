export const PROBLEM_JSON_CONTENT_TYPE = 'application/problem+json';

export const PROBLEM_TYPE_BASE_URI = 'https://cobrix.io/errors';

export const DEFAULT_PROBLEM_TYPE = 'about:blank';

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
