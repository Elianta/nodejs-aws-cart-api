-- CreateEnum
CREATE TYPE "cart_status" AS ENUM ('OPEN', 'ORDERED');

-- CreateTable
CREATE TABLE "cart_items" (
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("cart_id","product_id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "cart_status" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_connections" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_connections_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
