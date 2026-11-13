import { readFileSync } from 'node:fs';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

const HTTP_METHODS: readonly HttpMethod[] = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
];

export interface ContractResponse {
  status: number;
  headers: Record<string, unknown>;
  body: unknown;
  text?: string;
}

type SecurityRequirement = Record<string, string[]>;

export interface ContractOperation {
  method: HttpMethod;
  path: string;
  requiresAuth: boolean;
}

interface OperationObject {
  responses: Record<string, ResponseObject>;
  security?: SecurityRequirement[];
}

interface ResponseObject {
  $ref?: string;
  description?: string;
  content?: Record<string, { schema?: unknown }>;
}

export interface OpenApiDocument {
  openapi: string;
  info: Record<string, unknown>;
  paths: Record<
    string,
    Partial<Record<HttpMethod, OperationObject>> & Record<string, unknown>
  >;
  security?: SecurityRequirement[];
  components?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export class ContractViolation extends Error {
  override name = 'ContractViolation';
}

const DOCUMENT_ID = 'https://cobrix.io/contracts/openapi.json';

const OPENAPI_KEYWORDS = [
  'openapi',
  'info',
  'jsonSchemaDialect',
  'servers',
  'paths',
  'webhooks',
  'components',
  'security',
  'tags',
  'externalDocs',
  'example',
  'xml',
];

const escapePointer = (segment: string): string =>
  segment.replaceAll('~', '~0').replaceAll('/', '~1');

const isEmptyBody = ({ body, text }: ContractResponse): boolean =>
  (text === undefined || text === '') &&
  (body === undefined ||
    body === null ||
    body === '' ||
    (typeof body === 'object' && Object.keys(body).length === 0));

export class OpenApiContract {
  private readonly ajv = new Ajv2020({ allErrors: true, strict: true });
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(private readonly document: OpenApiDocument) {
    addFormats.default(this.ajv);
    for (const keyword of OPENAPI_KEYWORDS) this.ajv.addKeyword(keyword);
    this.ajv.addSchema(document, DOCUMENT_ID);
  }

  static fromFile(path: string): OpenApiContract {
    return new OpenApiContract(parse(readFileSync(path, 'utf8')));
  }

  assertResponse(
    method: HttpMethod,
    path: string,
    response: ContractResponse,
  ): void {
    const operationName = `${method.toUpperCase()} ${path}`;
    const pathItem = this.document.paths[path];
    if (!pathItem)
      throw new ContractViolation(`The contract does not define path ${path}`);

    const operation = pathItem[method];
    if (!operation)
      throw new ContractViolation(
        `The contract does not define ${operationName}`,
      );

    const statusKey = this.findStatusKey(operation.responses, response.status);
    if (!statusKey)
      throw new ContractViolation(
        `${operationName} does not declare status ${response.status}`,
      );

    const [declared, pointer] = this.resolveResponse(
      operation.responses[statusKey],
      `/paths/${escapePointer(path)}/${method}/responses/${statusKey}`,
    );
    const where = `${operationName} ${response.status}`;

    if (!declared.content) {
      if (!isEmptyBody(response))
        throw new ContractViolation(
          `${where} declares no content but a body was sent`,
        );
      return;
    }

    const mediaType = String(response.headers['content-type'] ?? '')
      .split(';')[0]
      .trim();
    const declaredMediaType = Object.keys(declared.content).find(
      (key) => key.toLowerCase() === mediaType.toLowerCase(),
    );
    if (!declaredMediaType)
      throw new ContractViolation(
        `${where} responded with content-type "${mediaType}", but the contract declares ${Object.keys(declared.content).join(', ')}`,
      );

    const validate = this.validatorFor(
      `${pointer}/content/${escapePointer(declaredMediaType)}/schema`,
    );
    if (!validate(response.body))
      throw new ContractViolation(
        `${where} body does not match the contract: ${this.ajv.errorsText(
          validate.errors,
          { dataVar: 'body' },
        )}`,
      );
  }

  operations(): ContractOperation[] {
    return Object.entries(this.document.paths).flatMap(([path, pathItem]) =>
      HTTP_METHODS.flatMap((method) => {
        const operation = pathItem[method];
        if (!operation) return [];
        const requirements = operation.security ?? this.document.security ?? [];
        const requiresAuth =
          requirements.length > 0 &&
          requirements.every(
            (requirement) => Object.keys(requirement).length > 0,
          );
        return [{ method, path, requiresAuth }];
      }),
    );
  }

  compileAllResponseSchemas(): void {
    for (const [path, pathItem] of Object.entries(this.document.paths)) {
      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];
        if (!operation) continue;
        for (const [status, response] of Object.entries(operation.responses)) {
          const [declared, pointer] = this.resolveResponse(
            response,
            `/paths/${escapePointer(path)}/${method}/responses/${status}`,
          );
          for (const mediaType of Object.keys(declared.content ?? {}))
            this.validatorFor(
              `${pointer}/content/${escapePointer(mediaType)}/schema`,
            );
        }
      }
    }
  }

  private findStatusKey(
    responses: Record<string, ResponseObject>,
    status: number,
  ): string | undefined {
    return [String(status), `${String(status)[0]}XX`, 'default'].find(
      (key) => key in responses,
    );
  }

  private resolveResponse(
    response: ResponseObject,
    pointer: string,
  ): [ResponseObject, string] {
    if (!response.$ref) return [response, pointer];
    if (!response.$ref.startsWith('#/'))
      throw new ContractViolation(
        `Only local response references are supported: ${response.$ref}`,
      );

    const refPointer = response.$ref.slice(1);
    const target = refPointer
      .split('/')
      .slice(1)
      .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'))
      .reduce<unknown>(
        (node, segment) => (node as Record<string, unknown>)?.[segment],
        this.document,
      ) as ResponseObject | undefined;
    if (!target)
      throw new ContractViolation(`Unresolvable reference ${response.$ref}`);

    return this.resolveResponse(target, refPointer);
  }

  private validatorFor(schemaPointer: string): ValidateFunction {
    let validate = this.validators.get(schemaPointer);
    if (!validate) {
      validate = this.ajv.compile({ $ref: `${DOCUMENT_ID}#${schemaPointer}` });
      this.validators.set(schemaPointer, validate);
    }
    return validate;
  }
}

export const cobrixContract = OpenApiContract.fromFile(
  'contracts/openapi.yaml',
);

export const assertMatchesContract = (
  method: HttpMethod,
  path: string,
  response: ContractResponse,
): void => cobrixContract.assertResponse(method, path, response);
