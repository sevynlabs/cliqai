-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'ATTENDANT');

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "retention_days" INTEGER NOT NULL DEFAULT 365,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ATTENDANT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "lead_phone" TEXT NOT NULL,
    "consent_given" BOOLEAN NOT NULL,
    "consent_version" TEXT NOT NULL,
    "consent_channel" TEXT NOT NULL,
    "consent_message" TEXT NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "erasure_requests" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "lead_phone" TEXT NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "erasure_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_clinic_id_email_key" ON "users"("clinic_id", "email");

-- CreateIndex
CREATE INDEX "consent_records_clinic_id_created_at_idx" ON "consent_records"("clinic_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "erasure_requests" ADD CONSTRAINT "erasure_requests_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PII encryption helper functions (LGPD-04)
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, key TEXT)
RETURNS TEXT AS $$
  SELECT encode(pgp_sym_encrypt(plaintext, key), 'base64');
$$ LANGUAGE SQL IMMUTABLE;

CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext TEXT, key TEXT)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(decode(ciphertext, 'base64'), key);
$$ LANGUAGE SQL IMMUTABLE;

-- Enable RLS on all tenant-scoped tables (Clinic is root tenant table, no RLS)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "erasure_requests" ENABLE ROW LEVEL SECURITY;

-- RLS policies (CRITICAL: TRUE as second arg = missing_ok, prevents errors during migrations)
CREATE POLICY tenant_isolation ON "users"
  USING ("clinic_id" = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON "consent_records"
  USING ("clinic_id" = current_setting('app.current_tenant', TRUE)::uuid);
CREATE POLICY tenant_isolation ON "erasure_requests"
  USING ("clinic_id" = current_setting('app.current_tenant', TRUE)::uuid);
