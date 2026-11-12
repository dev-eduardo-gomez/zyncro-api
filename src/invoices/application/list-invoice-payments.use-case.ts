import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../domain/ports/payment-repository.js';
import { Payment } from '../domain/models/payment.js';

@Injectable()
export class ListInvoicePaymentsUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(invoiceId: string): Promise<Payment[]> {
    const payment = await this.paymentRepository.findByInvoiceId(invoiceId);
    if (payment === null) throw new NotFoundException();

    return payment;
  }
}
