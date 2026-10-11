-- AlterEnum
ALTER TYPE "DepositStatus" ADD VALUE 'initiated';

-- AlterEnum
ALTER TYPE "EarningStatus" ADD VALUE 'skipped';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductStatus" ADD VALUE 'retired';
ALTER TYPE "ProductStatus" ADD VALUE 'draft';

-- AlterEnum
ALTER TYPE "WithdrawalStatus" ADD VALUE 'approved';
