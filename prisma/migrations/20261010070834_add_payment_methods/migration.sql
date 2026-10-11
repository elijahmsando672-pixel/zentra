-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('mpesa', 'paypal');

-- AlterTable
ALTER TABLE "Deposit" ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'mpesa',
ADD COLUMN     "providerReference" TEXT;
