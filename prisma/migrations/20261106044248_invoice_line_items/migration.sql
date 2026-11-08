/*
  Warnings:

  - You are about to drop the column `total_amount` on the `invoices` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[folio]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `currency` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `due_date` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tax` to the `invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "InvoiceStatus" ADD VALUE 'DISPUTED';

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "total_amount",
ADD COLUMN     "currency" CHAR(3) NOT NULL,
ADD COLUMN     "due_date" DATE NOT NULL,
ADD COLUMN     "folio" SERIAL NOT NULL,
ADD COLUMN     "subtotal" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "tax" DECIMAL(15,2) NOT NULL,
ADD COLUMN     "total" DECIMAL(15,2) NOT NULL;

-- CreateTable
CREATE TABLE "invoice_line_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "line_total" DECIMAL(15,2) NOT NULL,

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_line_items_invoice_id_position_key" ON "invoice_line_items"("invoice_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_folio_key" ON "invoices"("folio");

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
