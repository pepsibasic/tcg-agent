import 'dotenv/config'
import { prisma } from './client.js'
import {
  USERS,
  CARDS,
  USER_CARDS,
  EXTERNAL_CARDS,
  PACKS,
  PACK_CARDS,
  MARKETPLACE_LISTINGS,
  ACTIONS_LOG,
} from './seed-data.js'

async function main() {
  console.log('Starting seed...')

  // ── 1. Seed Users ────────────────────────────────────────────────────────
  for (const user of USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email },
      create: { id: user.id, email: user.email },
    })
  }
  console.log(`Seeded: ${USERS.length} users`)

  // ── 2. Seed Cards ────────────────────────────────────────────────────────
  for (const card of CARDS) {
    await prisma.card.upsert({
      where: { id: card.id },
      update: {
        name: card.name,
        ipCategory: card.ipCategory,
        setName: card.setName ?? null,
        language: card.language,
        grade: card.grade ?? null,
      },
      create: {
        id: card.id,
        name: card.name,
        ipCategory: card.ipCategory,
        setName: card.setName ?? null,
        language: card.language,
        grade: card.grade ?? null,
      },
    })
  }
  console.log(`Seeded: ${CARDS.length} cards`)

  // ── 3. Seed UserCards ────────────────────────────────────────────────────
  for (const uc of USER_CARDS) {
    await prisma.userCard.upsert({
      where: { id: uc.id },
      update: {
        state: uc.state,
        estimatedValue: uc.estimatedValue ?? null,
        priceFetchedAt: uc.priceFetchedAt ?? null,
        priceConfidence: uc.priceConfidence,
        certNumber: uc.certNumber ?? null,
        userNotes: uc.userNotes ?? null,
      },
      create: {
        id: uc.id,
        userId: uc.userId,
        cardId: uc.cardId,
        state: uc.state,
        estimatedValue: uc.estimatedValue ?? null,
        priceFetchedAt: uc.priceFetchedAt ?? null,
        priceConfidence: uc.priceConfidence,
        certNumber: uc.certNumber ?? null,
        userNotes: uc.userNotes ?? null,
      },
    })
  }
  console.log(`Seeded: ${USER_CARDS.length} userCards`)

  // ── 4. Seed ExternalCards ────────────────────────────────────────────────
  for (const ec of EXTERNAL_CARDS) {
    await prisma.externalCard.upsert({
      where: { id: ec.id },
      update: {
        name: ec.name,
        setName: ec.setName ?? null,
        grade: ec.grade ?? null,
        certNumber: ec.certNumber ?? null,
        estimatedValue: ec.estimatedValue ?? null,
        priceConfidence: ec.priceConfidence,
        priceFetchedAt: ec.priceFetchedAt ?? null,
        userNotes: ec.userNotes ?? null,
      },
      create: {
        id: ec.id,
        userId: ec.userId,
        name: ec.name,
        setName: ec.setName ?? null,
        grade: ec.grade ?? null,
        certNumber: ec.certNumber ?? null,
        estimatedValue: ec.estimatedValue ?? null,
        priceConfidence: ec.priceConfidence,
        priceFetchedAt: ec.priceFetchedAt ?? null,
        userNotes: ec.userNotes ?? null,
      },
    })
  }
  console.log(`Seeded: ${EXTERNAL_CARDS.length} externalCards`)

  // ── 5. Seed Packs ────────────────────────────────────────────────────────
  for (const pack of PACKS) {
    await prisma.pack.upsert({
      where: { id: pack.id },
      update: {
        name: pack.name,
        ipCategory: pack.ipCategory,
        openedAt: pack.openedAt,
      },
      create: {
        id: pack.id,
        userId: pack.userId,
        name: pack.name,
        ipCategory: pack.ipCategory,
        openedAt: pack.openedAt,
      },
    })
  }
  console.log(`Seeded: ${PACKS.length} packs`)

  // ── 6. Seed PackCards ────────────────────────────────────────────────────
  for (const pc of PACK_CARDS) {
    await prisma.packCard.upsert({
      where: { id: pc.id },
      update: {},
      create: {
        id: pc.id,
        packId: pc.packId,
        cardId: pc.cardId,
      },
    })
  }
  console.log(`Seeded: ${PACK_CARDS.length} packCards`)

  // ── 7. Seed MarketplaceListings ──────────────────────────────────────────
  for (const listing of MARKETPLACE_LISTINGS) {
    await prisma.marketplaceListing.upsert({
      where: { id: listing.id },
      update: {
        listPrice: listing.listPrice,
        status: listing.status,
        listedAt: listing.listedAt,
      },
      create: {
        id: listing.id,
        userCardId: listing.userCardId,
        listPrice: listing.listPrice,
        status: listing.status,
        listedAt: listing.listedAt,
      },
    })
  }
  console.log(`Seeded: ${MARKETPLACE_LISTINGS.length} marketplaceListings`)

  // ── 8. Seed ActionsLog ───────────────────────────────────────────────────
  for (const entry of ACTIONS_LOG) {
    await prisma.actionsLog.upsert({
      where: { id: entry.id },
      update: {
        agentRecommended: entry.agentRecommended,
        userAction: entry.userAction ?? null,
      },
      create: {
        id: entry.id,
        userId: entry.userId,
        cardId: entry.cardId ?? null,
        agentRecommended: entry.agentRecommended,
        userAction: entry.userAction ?? null,
      },
    })
  }
  console.log(`Seeded: ${ACTIONS_LOG.length} actionsLog entries`)

  // ── Summary ──────────────────────────────────────────────────────────────
  const vaultedCount  = USER_CARDS.filter(uc => uc.state === 'VAULTED').length
  const externalCount = USER_CARDS.filter(uc => uc.state === 'EXTERNAL').length
  const onMarketCount = USER_CARDS.filter(uc => uc.state === 'ON_MARKET').length
  const inTransitCount = USER_CARDS.filter(uc => uc.state === 'IN_TRANSIT').length

  console.log('\n--- Seed Summary ---')
  console.log(`Users:                 ${USERS.length}`)
  console.log(`Cards:                 ${CARDS.length} (across ${new Set(CARDS.map(c => c.ipCategory)).size} IPs)`)
  console.log(`UserCards:             ${USER_CARDS.length} total`)
  console.log(`  VAULTED:             ${vaultedCount}`)
  console.log(`  EXTERNAL:            ${externalCount}`)
  console.log(`  ON_MARKET:           ${onMarketCount}`)
  console.log(`  IN_TRANSIT:          ${inTransitCount}`)
  console.log(`ExternalCards:         ${EXTERNAL_CARDS.length}`)
  console.log(`Packs:                 ${PACKS.length}`)
  console.log(`PackCards:             ${PACK_CARDS.length}`)
  console.log(`MarketplaceListings:   ${MARKETPLACE_LISTINGS.length}`)
  console.log(`ActionsLog entries:    ${ACTIONS_LOG.length}`)
  console.log('--------------------')
  console.log('Seed complete.')
}

main()
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
