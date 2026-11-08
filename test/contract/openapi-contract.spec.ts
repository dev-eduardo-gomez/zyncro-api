import {
  ContractViolation,
  OpenApiContract,
  type OpenApiDocument,
} from './openapi-contract.js';

const PROBLEM = 'application/problem+json';

const document: OpenApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Test contract', version: '1.0.0' },
  paths: {
    '/widgets/{id}': {
      get: {
        responses: {
          '200': {
            description: 'A widget.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Widget' },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        responses: { '204': { description: 'Deleted.' } },
      },
    },
  },
  components: {
    schemas: {
      Widget: {
        type: 'object',
        required: ['id', 'ownerEmail'],
        additionalProperties: false,
        properties: {
          id: { type: 'string', format: 'uuid' },
          ownerEmail: { type: 'string', format: 'email', writeOnly: false },
        },
      },
      Problem: {
        type: 'object',
        required: ['status'],
        properties: { status: { type: 'integer' } },
      },
    },
    responses: {
      NotFound: {
        description: 'Not found.',
        content: {
          [PROBLEM]: { schema: { $ref: '#/components/schemas/Problem' } },
        },
      },
    },
  },
};

const widget = {
  id: '8f14e45f-ceea-467f-a0e6-1b3c4d5e6f70',
  ownerEmail: 'owner@cobrix.io',
};

const json = (status: number, body: unknown, type = 'application/json') => ({
  status,
  headers: { 'content-type': `${type}; charset=utf-8` },
  body,
});

describe('OpenApiContract', () => {
  const contract = new OpenApiContract(document);

  it('accepts a response that matches the declared schema', () => {
    expect(() =>
      contract.assertResponse('get', '/widgets/{id}', json(200, widget)),
    ).not.toThrow();
  });

  it('rejects a body that misses a required property', () => {
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(200, { id: widget.id }),
      ),
    ).toThrow(/must have required property 'ownerEmail'/);
  });

  it('rejects a renamed property when the schema forbids additional ones', () => {
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(200, { id: widget.id, owner_email: widget.ownerEmail }),
      ),
    ).toThrow(ContractViolation);
  });

  it('validates string formats', () => {
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(200, { ...widget, ownerEmail: 'not-an-email' }),
      ),
    ).toThrow(/must match format "email"/);
  });

  it('rejects a status the operation does not declare', () => {
    expect(() =>
      contract.assertResponse('get', '/widgets/{id}', json(500, {}, PROBLEM)),
    ).toThrow('GET /widgets/{id} does not declare status 500');
  });

  it('rejects a content type the response does not declare', () => {
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(200, widget, PROBLEM),
      ),
    ).toThrow(/content-type "application\/problem\+json".*application\/json/);
  });

  it('resolves a $ref to a shared response component', () => {
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(404, { status: 404 }, PROBLEM),
      ),
    ).not.toThrow();
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(404, { status: 'not-a-number' }, PROBLEM),
      ),
    ).toThrow(/body\/status must be integer/);
  });

  it('accepts an empty body when the response declares no content', () => {
    expect(() =>
      contract.assertResponse('delete', '/widgets/{id}', {
        status: 204,
        headers: {},
        body: {},
      }),
    ).not.toThrow();
  });

  it('rejects a body when the response declares no content', () => {
    expect(() =>
      contract.assertResponse(
        'delete',
        '/widgets/{id}',
        json(204, { unexpected: true }),
      ),
    ).toThrow(
      'DELETE /widgets/{id} 204 declares no content but a body was sent',
    );
  });

  it('rejects a text body when the response declares no content', () => {
    // Supertest leaves `body` as {} for non-JSON responses; the raw text is
    // what reveals the body.
    expect(() =>
      contract.assertResponse('delete', '/widgets/{id}', {
        status: 204,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        body: {},
        text: 'Hello World!',
      }),
    ).toThrow(
      'DELETE /widgets/{id} 204 declares no content but a body was sent',
    );
  });

  it('matches the content type case-insensitively', () => {
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(200, widget, 'Application/JSON'),
      ),
    ).not.toThrow();
  });

  it('rejects a content type that collides with an object property name', () => {
    expect(() =>
      contract.assertResponse(
        'get',
        '/widgets/{id}',
        json(200, widget, 'toString'),
      ),
    ).toThrow(ContractViolation);
  });

  it('rejects a path the contract does not define', () => {
    expect(() =>
      contract.assertResponse('get', '/gadgets', json(200, {})),
    ).toThrow('The contract does not define path /gadgets');
  });

  it('rejects a method the path does not define', () => {
    expect(() =>
      contract.assertResponse('post', '/widgets/{id}', json(200, widget)),
    ).toThrow('The contract does not define POST /widgets/{id}');
  });
});

describe('OpenApiContract strict schemas', () => {
  it('fails to compile a schema with a misspelled keyword', () => {
    const contract = new OpenApiContract({
      ...document,
      paths: {
        '/typo': {
          get: {
            responses: {
              '200': {
                description: 'Typo.',
                content: {
                  'application/json': {
                    schema: { type: 'object', requird: ['id'] },
                  },
                },
              },
            },
          },
        },
      },
    });

    expect(() => contract.compileAllResponseSchemas()).toThrow(
      /unknown keyword: "requird"/,
    );
  });
});

describe('OpenApiContract path-level fields', () => {
  it('compiles a path item that declares shared parameters', () => {
    const contract = new OpenApiContract({
      ...document,
      paths: {
        '/widgets/{id}': {
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          ...document.paths['/widgets/{id}'],
        },
      },
    });

    expect(() => contract.compileAllResponseSchemas()).not.toThrow();
  });
});

describe('OpenApiContract operations', () => {
  const noContent = { responses: { '204': { description: 'Done.' } } };

  it('marks each operation as protected or public from its security', () => {
    const contract = new OpenApiContract({
      ...document,
      security: [{ bearerAuth: [] }],
      paths: {
        '/inherits': { get: noContent },
        '/public': { post: { ...noContent, security: [] } },
        '/optional': { get: { ...noContent, security: [{}] } },
        '/explicit': { delete: { ...noContent, security: [{ apiKey: [] }] } },
      },
    });

    expect(contract.operations()).toEqual([
      { method: 'get', path: '/inherits', requiresAuth: true },
      { method: 'post', path: '/public', requiresAuth: false },
      { method: 'get', path: '/optional', requiresAuth: false },
      { method: 'delete', path: '/explicit', requiresAuth: true },
    ]);
  });

  it('treats operations as public when there is no global security', () => {
    const contract = new OpenApiContract({
      ...document,
      paths: { '/open': { get: noContent } },
    });

    expect(contract.operations()).toEqual([
      { method: 'get', path: '/open', requiresAuth: false },
    ]);
  });
});

describe('contracts/openapi.yaml', () => {
  it('compiles every response schema it declares', () => {
    const contract = OpenApiContract.fromFile('contracts/openapi.yaml');

    expect(() => contract.compileAllResponseSchemas()).not.toThrow();
  });
});
