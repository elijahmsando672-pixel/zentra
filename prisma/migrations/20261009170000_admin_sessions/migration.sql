ALTER TABLE "AdminStaff" ADD COLUMN "passwordHash" TEXT;

CREATE TABLE "AdminSession" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "staffId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");
CREATE INDEX "AdminSession_staffId_idx" ON "AdminSession"("staffId");
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "AdminStaff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
