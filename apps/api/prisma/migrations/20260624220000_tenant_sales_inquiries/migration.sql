-- CreateTable
CREATE TABLE "tenant_sales_inquiries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "requested_plan_id" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "message" TEXT,
    "billing_interval" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "instructions_sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilled_at" TIMESTAMP(3),

    CONSTRAINT "tenant_sales_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_sales_inquiry_receipts" (
    "id" TEXT NOT NULL,
    "inquiry_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_sales_inquiry_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_sales_inquiries_tenant_id_status_idx" ON "tenant_sales_inquiries"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "tenant_sales_inquiry_receipts_inquiry_id_idx" ON "tenant_sales_inquiry_receipts"("inquiry_id");

-- AddForeignKey
ALTER TABLE "tenant_sales_inquiries" ADD CONSTRAINT "tenant_sales_inquiries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sales_inquiries" ADD CONSTRAINT "tenant_sales_inquiries_requested_plan_id_fkey" FOREIGN KEY ("requested_plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sales_inquiries" ADD CONSTRAINT "tenant_sales_inquiries_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sales_inquiry_receipts" ADD CONSTRAINT "tenant_sales_inquiry_receipts_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "tenant_sales_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_sales_inquiry_receipts" ADD CONSTRAINT "tenant_sales_inquiry_receipts_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
