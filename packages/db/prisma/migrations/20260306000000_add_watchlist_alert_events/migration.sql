-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "cardKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_events" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "cardKey" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',

    CONSTRAINT "alert_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watchlist_items_userId_idx" ON "watchlist_items"("userId");

-- CreateIndex
CREATE INDEX "watchlist_items_cardKey_idx" ON "watchlist_items"("cardKey");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_userId_cardKey_key" ON "watchlist_items"("userId", "cardKey");

-- CreateIndex
CREATE INDEX "alert_events_userId_idx" ON "alert_events"("userId");

-- CreateIndex
CREATE INDEX "alert_events_alertId_idx" ON "alert_events"("alertId");

-- CreateIndex
CREATE INDEX "alert_events_status_idx" ON "alert_events"("status");
