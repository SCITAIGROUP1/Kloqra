CREATE TABLE "platform_catalog_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pricing_baseline_features" JSONB NOT NULL DEFAULT '[]',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_catalog_settings_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_catalog_settings_singleton" CHECK ("id" = 1)
);

INSERT INTO "platform_catalog_settings" ("id", "pricing_baseline_features", "updated_at")
VALUES (
    1,
    '["Time tracking and timesheets","Approval workflows","Exports and reporting","Mobile-friendly access"]'::jsonb,
    CURRENT_TIMESTAMP
);
