-- CreateTable
CREATE TABLE "card_price_history" (
    "id" TEXT NOT NULL,
    "cardKey" TEXT NOT NULL,
    "asOfDate" DATE NOT NULL,
    "marketPriceUsd" DOUBLE PRECISION,
    "confidence" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "card_price_history_cardKey_idx" ON "card_price_history"("cardKey");

-- CreateIndex
CREATE INDEX "card_price_history_asOfDate_idx" ON "card_price_history"("asOfDate");

-- CreateIndex
CREATE UNIQUE INDEX "card_price_history_cardKey_asOfDate_key" ON "card_price_history"("cardKey", "asOfDate");
