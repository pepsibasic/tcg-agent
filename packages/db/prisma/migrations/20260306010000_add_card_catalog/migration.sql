-- CreateTable
CREATE TABLE "card_catalog" (
    "cardKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "game" TEXT,
    "setName" TEXT,
    "variant" TEXT,
    "language" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_catalog_pkey" PRIMARY KEY ("cardKey")
);

-- CreateIndex
CREATE INDEX "card_catalog_title_idx" ON "card_catalog"("title");
