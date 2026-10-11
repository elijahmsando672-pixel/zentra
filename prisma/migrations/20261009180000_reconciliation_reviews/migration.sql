CREATE TABLE "ReconciliationReview" (
  "id" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "reviewer" TEXT NOT NULL,
  "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReconciliationReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReconciliationReview_dayKey_key" ON "ReconciliationReview"("dayKey");
