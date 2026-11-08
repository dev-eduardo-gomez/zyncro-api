/*
  Warnings:

  - Added the required column `address` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `credit_days` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `legal_name` to the `customers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "credit_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "credit_days" INTEGER NOT NULL,
ADD COLUMN     "legal_name" VARCHAR(200) NOT NULL;
