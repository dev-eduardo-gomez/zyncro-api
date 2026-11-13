/*
  Warnings:

  - You are about to drop the column `paid_amount` on the `payments` table. All the data in the column will be lost.
  - Added the required column `balance` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `amount` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `applied_amount` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `credit_amount` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- Add as nullable, backfill existing invoices (no payments yet, so the
-- pending balance is the full total), then enforce NOT NULL.
ALTER TABLE "invoices" ADD COLUMN "balance" DECIMAL(15,2);
UPDATE "invoices" SET "balance" = "total";
ALTER TABLE "invoices" ALTER COLUMN "balance" SET NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "paid_amount",
ADD COLUMN     "amount" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "applied_amount" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "credit_amount" DECIMAL(15,2) NOT NULL;

-- CreateIndex
CREATE INDEX "payments_invoice_id_created_at_idx" ON "payments"("invoice_id", "created_at");
