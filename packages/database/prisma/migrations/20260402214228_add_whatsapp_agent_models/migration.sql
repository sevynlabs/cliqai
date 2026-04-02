-- CreateTable
CREATE TABLE "whatsapp_instances" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "instance_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "phone_number" TEXT,
    "qr_code_base64" TEXT,
    "connected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_configs" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "persona_name" TEXT NOT NULL DEFAULT 'Sofia',
    "tone" TEXT NOT NULL DEFAULT 'informal',
    "specialty_text" TEXT,
    "emoji_usage" BOOLEAN NOT NULL DEFAULT true,
    "operating_hours_start" INTEGER NOT NULL DEFAULT 8,
    "operating_hours_end" INTEGER NOT NULL DEFAULT 20,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "max_turns" INTEGER NOT NULL DEFAULT 20,
    "system_prompt_extra" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "organization_id" TEXT NOT NULL,
    "remote_jid" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "turn_count" INTEGER NOT NULL DEFAULT 0,
    "qualification_stage" TEXT NOT NULL DEFAULT 'consent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_organization_id_key" ON "whatsapp_instances"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_instances_instance_name_key" ON "whatsapp_instances"("instance_name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_configs_organization_id_key" ON "agent_configs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_thread_id_key" ON "conversations"("thread_id");

-- CreateIndex
CREATE INDEX "conversations_organization_id_status_idx" ON "conversations"("organization_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_organization_id_remote_jid_key" ON "conversations"("organization_id", "remote_jid");

-- AddForeignKey
ALTER TABLE "whatsapp_instances" ADD CONSTRAINT "whatsapp_instances_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on WhatsApp/Agent tables
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON whatsapp_instances USING (organization_id = current_setting('app.current_tenant', TRUE));

ALTER TABLE agent_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agent_configs USING (organization_id = current_setting('app.current_tenant', TRUE));

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversations USING (organization_id = current_setting('app.current_tenant', TRUE));
