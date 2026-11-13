import { ValidateBy, type ValidationOptions } from 'class-validator';

export const encodeInvoiceCursor = (folio: number): string =>
  Buffer.from(JSON.stringify({ folio })).toString('base64url');

export const decodeInvoiceCursor = (cursor: string): number | null => {
  try {
    const payload: unknown = JSON.parse(
      Buffer.from(cursor, 'base64url').toString('utf8'),
    );
    if (typeof payload !== 'object' || payload === null) return null;
    const { folio } = payload as { folio?: unknown };
    return typeof folio === 'number' && Number.isSafeInteger(folio) && folio > 0
      ? folio
      : null;
  } catch {
    return null;
  }
};

export const IsInvoiceCursor = (options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isInvoiceCursor',
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && decodeInvoiceCursor(value) !== null,
        defaultMessage: () =>
          'cursor must be the nextCursor of a previous page',
      },
    },
    options,
  );
