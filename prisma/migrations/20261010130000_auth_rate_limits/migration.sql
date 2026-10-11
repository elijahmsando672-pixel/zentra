CREATE TABLE "AuthRateLimit" (
    "key" TEXT NOT NULL,
    "windowEndsAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "AuthRateLimit_windowEndsAt_idx" ON "AuthRateLimit"("windowEndsAt");
