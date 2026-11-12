import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../domain/ports/payment-repository.js';
import { NewPayment, Payment } from '../domain/models/payment.js';
import { allocatePayment } from '../domain/services/allocate-payment.js';

@Injectable()
export class RegisterPaymentUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(invoiceId: string, payment: NewPayment): Promise<Payment> {
    const created = await this.paymentRepository.register(
      invoiceId,
      payment,
      (invoicePayment) => allocatePayment(invoicePayment, payment.amount),
    );

    if (created === null) throw new NotFoundException();

    return created;
  }
}
