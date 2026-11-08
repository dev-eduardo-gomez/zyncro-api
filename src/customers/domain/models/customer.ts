export interface Customer {
  readonly id: string;
  readonly taxId: string;
  readonly legalName: string;
  readonly address: string;
  readonly contactEmail: string;
  readonly creditDays: number;
  readonly creditBalance: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NewCustomer {
  readonly taxId: string;
  readonly legalName: string;
  readonly address: string;
  readonly contactEmail: string;
  readonly creditDays: number;
}

export interface CustomerChanges {
  readonly legalName?: string;
  readonly address?: string;
  readonly contactEmail?: string;
  readonly creditDays?: number;
}
