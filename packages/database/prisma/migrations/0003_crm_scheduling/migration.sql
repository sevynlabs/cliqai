-- CreateTable: leads
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'novo',
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "procedure_interest" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[],
    "conversation_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lead_annotations
CREATE TABLE "lead_annotations" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_by" TEXT NOT NULL DEFAULT 'ai',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: lead_timeline
CREATE TABLE "lead_timeline" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_timeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable: calendar_tokens
CREATE TABLE "calendar_tokens" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "professional_id" TEXT,
    "calendar_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: appointments
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "lead_id" UUID NOT NULL,
    "calendar_event_id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'tentative',
    "procedure_name" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: leads unique (org + phone)
CREATE UNIQUE INDEX "leads_conversation_id_key" ON "leads"("conversation_id");
CREATE UNIQUE INDEX "leads_organization_id_phone_key" ON "leads"("organization_id", "phone");
CREATE INDEX "leads_organization_id_stage_idx" ON "leads"("organization_id", "stage");
CREATE INDEX "leads_organization_id_created_at_idx" ON "leads"("organization_id", "created_at");

-- CreateIndex: lead_annotations
CREATE INDEX "lead_annotations_lead_id_created_at_idx" ON "lead_annotations"("lead_id", "created_at");

-- CreateIndex: lead_timeline
CREATE INDEX "lead_timeline_lead_id_created_at_idx" ON "lead_timeline"("lead_id", "created_at");

-- CreateIndex: calendar_tokens
CREATE UNIQUE INDEX "calendar_tokens_organization_id_professional_id_key" ON "calendar_tokens"("organization_id", "professional_id");

-- CreateIndex: appointments
CREATE INDEX "appointments_organization_id_start_at_idx" ON "appointments"("organization_id", "start_at");
CREATE INDEX "appointments_lead_id_idx" ON "appointments"("lead_id");

-- AddForeignKey: leads -> organization
ALTER TABLE "leads" ADD CONSTRAINT "leads_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: leads -> conversations
ALTER TABLE "leads" ADD CONSTRAINT "leads_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: lead_annotations -> leads
ALTER TABLE "lead_annotations" ADD CONSTRAINT "lead_annotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: lead_timeline -> leads
ALTER TABLE "lead_timeline" ADD CONSTRAINT "lead_timeline_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: calendar_tokens -> organization
ALTER TABLE "calendar_tokens" ADD CONSTRAINT "calendar_tokens_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: appointments -> organization
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: appointments -> leads
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on all CRM/Scheduling tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON leads USING (organization_id = current_setting('app.current_tenant', TRUE));

ALTER TABLE lead_annotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON lead_annotations USING (lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_tenant', TRUE)));

ALTER TABLE lead_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON lead_timeline USING (lead_id IN (SELECT id FROM leads WHERE organization_id = current_setting('app.current_tenant', TRUE)));

ALTER TABLE calendar_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON calendar_tokens USING (organization_id = current_setting('app.current_tenant', TRUE));

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON appointments USING (organization_id = current_setting('app.current_tenant', TRUE));
