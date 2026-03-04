-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CardState" AS ENUM ('VAULTED', 'EXTERNAL', 'ON_MARKET', 'IN_TRANSIT');

-- CreateEnum
CREATE TYPE "PriceConfidence" AS ENUM ('LIVE', 'RECENT_24H', 'STALE_7D', 'NO_DATA');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ipCategory" TEXT NOT NULL,
    "setName" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "grade" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_cards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "state" "CardState" NOT NULL,
    "estimatedValue" DECIMAL(10,2),
    "priceFetchedAt" TIMESTAMP(3),
    "priceConfidence" "PriceConfidence" NOT NULL DEFAULT 'NO_DATA',
    "certNumber" TEXT,
    "userNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_cards" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "setName" TEXT,
    "grade" TEXT,
    "certNumber" TEXT,
    "estimatedValue" DECIMAL(10,2),
    "priceConfidence" "PriceConfidence" NOT NULL DEFAULT 'NO_DATA',
    "priceFetchedAt" TIMESTAMP(3),
    "userNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "external_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ipCategory" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_cards" (
    "id" UUID NOT NULL,
    "packId" UUID NOT NULL,
    "cardId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" UUID NOT NULL,
    "userCardId" UUID NOT NULL,
    "listPrice" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "listedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actions_log" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardId" UUID,
    "agentRecommended" JSONB NOT NULL,
    "userAction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "actions_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_cards_userId_idx" ON "user_cards"("userId");

-- CreateIndex
CREATE INDEX "user_cards_state_idx" ON "user_cards"("state");

-- CreateIndex
CREATE INDEX "external_cards_userId_idx" ON "external_cards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listings_userCardId_key" ON "marketplace_listings"("userCardId");

-- CreateIndex
CREATE INDEX "actions_log_userId_idx" ON "actions_log"("userId");

-- AddForeignKey
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cards" ADD CONSTRAINT "user_cards_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_cards" ADD CONSTRAINT "external_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_cards" ADD CONSTRAINT "pack_cards_packId_fkey" FOREIGN KEY ("packId") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_cards" ADD CONSTRAINT "pack_cards_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_userCardId_fkey" FOREIGN KEY ("userCardId") REFERENCES "user_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions_log" ADD CONSTRAINT "actions_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
