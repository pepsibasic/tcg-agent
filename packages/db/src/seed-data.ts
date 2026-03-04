import { CardState, PriceConfidence } from './generated/client/index.js'

// ─── Fixed UUIDs for idempotent upserts ──────────────────────────────────────
// Using UUIDv7-format strings (time-sortable) with fixed values for reproducibility

// Users
export const USER_COLLECTOR_ID = '0190f0e0-0001-7000-8000-000000000001'
export const USER_FLIPPER_ID   = '0190f0e0-0001-7000-8000-000000000002'
export const USER_NEW_ID       = '0190f0e0-0001-7000-8000-000000000003'

// Cards — Pokemon (~15)
export const CARD_CHARIZARD_VMAX_ID  = '0190f0e0-0002-7000-8000-000000000001'
export const CARD_CHARIZARD_GX_ID    = '0190f0e0-0002-7000-8000-000000000002'
export const CARD_PIKACHU_V_ID       = '0190f0e0-0002-7000-8000-000000000003'
export const CARD_MEWTWO_GX_ID       = '0190f0e0-0002-7000-8000-000000000004'
export const CARD_RAYQUAZA_VMAX_ID   = '0190f0e0-0002-7000-8000-000000000005'
export const CARD_UMBREON_VMAX_ID    = '0190f0e0-0002-7000-8000-000000000006'
export const CARD_BLASTOISE_EX_ID    = '0190f0e0-0002-7000-8000-000000000007'
export const CARD_VENUSAUR_EX_ID     = '0190f0e0-0002-7000-8000-000000000008'
export const CARD_EEVEE_V_ID         = '0190f0e0-0002-7000-8000-000000000009'
export const CARD_GENGAR_VMAX_ID     = '0190f0e0-0002-7000-8000-00000000000a'
export const CARD_LUGIA_V_ID         = '0190f0e0-0002-7000-8000-00000000000b'
export const CARD_SNORLAX_VMAX_ID    = '0190f0e0-0002-7000-8000-00000000000c'
export const CARD_PIKACHU_PROMO_ID   = '0190f0e0-0002-7000-8000-00000000000d'
export const CARD_MEW_VMAX_ID        = '0190f0e0-0002-7000-8000-00000000000e'
export const CARD_DRAGONITE_V_ID     = '0190f0e0-0002-7000-8000-00000000000f'

// Cards — One Piece (~12)
export const CARD_LUFFY_LEADER_ID    = '0190f0e0-0003-7000-8000-000000000001'
export const CARD_ZORO_LEADER_ID     = '0190f0e0-0003-7000-8000-000000000002'
export const CARD_NAMI_ID            = '0190f0e0-0003-7000-8000-000000000003'
export const CARD_ACE_RARE_ID        = '0190f0e0-0003-7000-8000-000000000004'
export const CARD_SHANKS_SEC_ID      = '0190f0e0-0003-7000-8000-000000000005'
export const CARD_KAIDO_ID           = '0190f0e0-0003-7000-8000-000000000006'
export const CARD_ROBIN_ID           = '0190f0e0-0003-7000-8000-000000000007'
export const CARD_SANJI_ID           = '0190f0e0-0003-7000-8000-000000000008'
export const CARD_USOPP_ID           = '0190f0e0-0003-7000-8000-000000000009'
export const CARD_CHOPPER_ID         = '0190f0e0-0003-7000-8000-00000000000a'
export const CARD_BROOK_ID           = '0190f0e0-0003-7000-8000-00000000000b'
export const CARD_FRANKY_ID          = '0190f0e0-0003-7000-8000-00000000000c'

// Cards — Sports (~12)
export const CARD_TROUT_ROOKIE_ID    = '0190f0e0-0004-7000-8000-000000000001'
export const CARD_OHTANI_AUTO_ID     = '0190f0e0-0004-7000-8000-000000000002'
export const CARD_JUDGE_RC_ID        = '0190f0e0-0004-7000-8000-000000000003'
export const CARD_WEMBY_ROOKIE_ID    = '0190f0e0-0004-7000-8000-000000000004'
export const CARD_LEBRON_LOGO_ID     = '0190f0e0-0004-7000-8000-000000000005'
export const CARD_LUKA_PRIZM_ID      = '0190f0e0-0004-7000-8000-000000000006'
export const CARD_SOTO_AUTO_ID       = '0190f0e0-0004-7000-8000-000000000007'
export const CARD_MAHOMES_RC_ID      = '0190f0e0-0004-7000-8000-000000000008'
export const CARD_ACUNA_RC_ID        = '0190f0e0-0004-7000-8000-000000000009'
export const CARD_TATUM_PRIZM_ID     = '0190f0e0-0004-7000-8000-00000000000a'
export const CARD_SHOHEI_BASE_ID     = '0190f0e0-0004-7000-8000-00000000000b'
export const CARD_CURRY_PRIZM_ID     = '0190f0e0-0004-7000-8000-00000000000c'

// Cards — Yu-Gi-Oh (~11)
export const CARD_BLUE_EYES_ORIG_ID  = '0190f0e0-0005-7000-8000-000000000001'
export const CARD_DARK_MAGICIAN_ID   = '0190f0e0-0005-7000-8000-000000000002'
export const CARD_EXODIA_HEAD_ID     = '0190f0e0-0005-7000-8000-000000000003'
export const CARD_RAIGEKI_ORIG_ID    = '0190f0e0-0005-7000-8000-000000000004'
export const CARD_MONSTER_REBORN_ID  = '0190f0e0-0005-7000-8000-000000000005'
export const CARD_POTE_AVARICE_ID    = '0190f0e0-0005-7000-8000-000000000006'
export const CARD_BRANDED_FUSION_ID  = '0190f0e0-0005-7000-8000-000000000007'
export const CARD_NIBIRU_ID          = '0190f0e0-0005-7000-8000-000000000008'
export const CARD_ASH_BLOSSOM_ID     = '0190f0e0-0005-7000-8000-000000000009'
export const CARD_SOLEMN_JUDGMENT_ID = '0190f0e0-0005-7000-8000-00000000000a'
export const CARD_LIGHTNING_STORM_ID = '0190f0e0-0005-7000-8000-00000000000b'

// UserCards — fixed IDs for upsert
export const UC_001_ID = '0190f0e0-0006-7000-8000-000000000001'
export const UC_002_ID = '0190f0e0-0006-7000-8000-000000000002'
export const UC_003_ID = '0190f0e0-0006-7000-8000-000000000003'
export const UC_004_ID = '0190f0e0-0006-7000-8000-000000000004'
export const UC_005_ID = '0190f0e0-0006-7000-8000-000000000005'
export const UC_006_ID = '0190f0e0-0006-7000-8000-000000000006'
export const UC_007_ID = '0190f0e0-0006-7000-8000-000000000007'
export const UC_008_ID = '0190f0e0-0006-7000-8000-000000000008'
export const UC_009_ID = '0190f0e0-0006-7000-8000-000000000009'
export const UC_010_ID = '0190f0e0-0006-7000-8000-00000000000a'
export const UC_011_ID = '0190f0e0-0006-7000-8000-00000000000b'
export const UC_012_ID = '0190f0e0-0006-7000-8000-00000000000c'
export const UC_013_ID = '0190f0e0-0006-7000-8000-00000000000d'
export const UC_014_ID = '0190f0e0-0006-7000-8000-00000000000e'
export const UC_015_ID = '0190f0e0-0006-7000-8000-00000000000f'
export const UC_016_ID = '0190f0e0-0006-7000-8000-000000000010'
export const UC_017_ID = '0190f0e0-0006-7000-8000-000000000011'
export const UC_018_ID = '0190f0e0-0006-7000-8000-000000000012'
export const UC_019_ID = '0190f0e0-0006-7000-8000-000000000013'
export const UC_020_ID = '0190f0e0-0006-7000-8000-000000000014'
export const UC_021_ID = '0190f0e0-0006-7000-8000-000000000015'
export const UC_022_ID = '0190f0e0-0006-7000-8000-000000000016'
export const UC_023_ID = '0190f0e0-0006-7000-8000-000000000017'
export const UC_024_ID = '0190f0e0-0006-7000-8000-000000000018'
export const UC_025_ID = '0190f0e0-0006-7000-8000-000000000019'
export const UC_026_ID = '0190f0e0-0006-7000-8000-00000000001a'
export const UC_027_ID = '0190f0e0-0006-7000-8000-00000000001b'
export const UC_028_ID = '0190f0e0-0006-7000-8000-00000000001c'
export const UC_029_ID = '0190f0e0-0006-7000-8000-00000000001d'
export const UC_030_ID = '0190f0e0-0006-7000-8000-00000000001e'
export const UC_031_ID = '0190f0e0-0006-7000-8000-00000000001f'
export const UC_032_ID = '0190f0e0-0006-7000-8000-000000000020'
export const UC_033_ID = '0190f0e0-0006-7000-8000-000000000021'
export const UC_034_ID = '0190f0e0-0006-7000-8000-000000000022'
export const UC_035_ID = '0190f0e0-0006-7000-8000-000000000023'
export const UC_036_ID = '0190f0e0-0006-7000-8000-000000000024'
export const UC_037_ID = '0190f0e0-0006-7000-8000-000000000025'
export const UC_038_ID = '0190f0e0-0006-7000-8000-000000000026'
export const UC_039_ID = '0190f0e0-0006-7000-8000-000000000027'
export const UC_040_ID = '0190f0e0-0006-7000-8000-000000000028'
export const UC_041_ID = '0190f0e0-0006-7000-8000-000000000029'
export const UC_042_ID = '0190f0e0-0006-7000-8000-00000000002a'

// ExternalCards
export const EC_001_ID = '0190f0e0-0007-7000-8000-000000000001'
export const EC_002_ID = '0190f0e0-0007-7000-8000-000000000002'
export const EC_003_ID = '0190f0e0-0007-7000-8000-000000000003'
export const EC_004_ID = '0190f0e0-0007-7000-8000-000000000004'
export const EC_005_ID = '0190f0e0-0007-7000-8000-000000000005'
export const EC_006_ID = '0190f0e0-0007-7000-8000-000000000006'

// Packs
export const PACK_OBSIDIAN_ID = '0190f0e0-0008-7000-8000-000000000001'
export const PACK_ONEPIECE_ID = '0190f0e0-0008-7000-8000-000000000002'

// PackCards
export const PC_001_ID = '0190f0e0-0009-7000-8000-000000000001'
export const PC_002_ID = '0190f0e0-0009-7000-8000-000000000002'
export const PC_003_ID = '0190f0e0-0009-7000-8000-000000000003'
export const PC_004_ID = '0190f0e0-0009-7000-8000-000000000004'
export const PC_005_ID = '0190f0e0-0009-7000-8000-000000000005'

// MarketplaceListings
export const ML_001_ID = '0190f0e0-000a-7000-8000-000000000001'
export const ML_002_ID = '0190f0e0-000a-7000-8000-000000000002'
export const ML_003_ID = '0190f0e0-000a-7000-8000-000000000003'
export const ML_004_ID = '0190f0e0-000a-7000-8000-000000000004'

// ActionsLog
export const AL_001_ID = '0190f0e0-000b-7000-8000-000000000001'
export const AL_002_ID = '0190f0e0-000b-7000-8000-000000000002'
export const AL_003_ID = '0190f0e0-000b-7000-8000-000000000003'

// ─── Timestamps ───────────────────────────────────────────────────────────────
const NOW = new Date()
const RECENT_1H  = new Date(NOW.getTime() - 1 * 60 * 60 * 1000)
const RECENT_12H = new Date(NOW.getTime() - 12 * 60 * 60 * 1000)
const STALE_3D   = new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000)
const STALE_8D   = new Date(NOW.getTime() - 8 * 24 * 60 * 60 * 1000)

// ─── Users ────────────────────────────────────────────────────────────────────

export const USERS = [
  {
    id: USER_COLLECTOR_ID,
    email: 'alice@example.com',
  },
  {
    id: USER_FLIPPER_ID,
    email: 'bob@example.com',
  },
  {
    id: USER_NEW_ID,
    email: 'carol@example.com',
  },
]

// ─── Cards ────────────────────────────────────────────────────────────────────

export const CARDS = [
  // ── Pokemon ──────────────────────────────────────────────────────────────
  { id: CARD_CHARIZARD_VMAX_ID,  name: 'Charizard VMAX',       ipCategory: 'pokemon',   setName: 'Champion\'s Path', language: 'en', grade: 'PSA 10' },
  { id: CARD_CHARIZARD_GX_ID,    name: 'Charizard GX',          ipCategory: 'pokemon',   setName: 'Hidden Fates',     language: 'en', grade: 'PSA 9'  },
  { id: CARD_PIKACHU_V_ID,       name: 'Pikachu V',             ipCategory: 'pokemon',   setName: 'Vivid Voltage',    language: 'en', grade: 'BGS 9.5'},
  { id: CARD_MEWTWO_GX_ID,       name: 'Mewtwo GX',             ipCategory: 'pokemon',   setName: 'Shining Legends',  language: 'en', grade: 'PSA 10' },
  { id: CARD_RAYQUAZA_VMAX_ID,   name: 'Rayquaza VMAX',         ipCategory: 'pokemon',   setName: 'Evolving Skies',   language: 'en', grade: 'PSA 9'  },
  { id: CARD_UMBREON_VMAX_ID,    name: 'Umbreon VMAX Alt',      ipCategory: 'pokemon',   setName: 'Evolving Skies',   language: 'en', grade: 'RAW'    },
  { id: CARD_BLASTOISE_EX_ID,    name: 'Blastoise EX',          ipCategory: 'pokemon',   setName: 'XY Base Set',      language: 'en', grade: 'PSA 9'  },
  { id: CARD_VENUSAUR_EX_ID,     name: 'Venusaur EX',           ipCategory: 'pokemon',   setName: 'XY Base Set',      language: 'en', grade: 'RAW'    },
  { id: CARD_EEVEE_V_ID,         name: 'Eevee V Alt Art',       ipCategory: 'pokemon',   setName: 'Fusion Strike',    language: 'en', grade: 'RAW'    },
  { id: CARD_GENGAR_VMAX_ID,     name: 'Gengar VMAX Alt Art',   ipCategory: 'pokemon',   setName: 'Fusion Strike',    language: 'en', grade: 'PSA 10' },
  { id: CARD_LUGIA_V_ID,         name: 'Lugia V Alt Art',       ipCategory: 'pokemon',   setName: 'Silver Tempest',   language: 'en', grade: 'PSA 9'  },
  { id: CARD_SNORLAX_VMAX_ID,    name: 'Snorlax VMAX',          ipCategory: 'pokemon',   setName: 'Sword & Shield',   language: 'en', grade: 'RAW'    },
  { id: CARD_PIKACHU_PROMO_ID,   name: 'Pikachu Illustrator',   ipCategory: 'pokemon',   setName: 'Promo',            language: 'ja', grade: 'PSA 10' },
  { id: CARD_MEW_VMAX_ID,        name: 'Mew VMAX Alt Art',      ipCategory: 'pokemon',   setName: 'Fusion Strike',    language: 'en', grade: 'PSA 9'  },
  { id: CARD_DRAGONITE_V_ID,     name: 'Dragonite V Alt Art',   ipCategory: 'pokemon',   setName: 'Evolving Skies',   language: 'en', grade: 'RAW'    },

  // ── One Piece ─────────────────────────────────────────────────────────────
  { id: CARD_LUFFY_LEADER_ID,    name: 'Monkey D. Luffy Leader',ipCategory: 'one-piece', setName: 'OP-01',  language: 'ja', grade: 'RAW'    },
  { id: CARD_ZORO_LEADER_ID,     name: 'Roronoa Zoro Leader',   ipCategory: 'one-piece', setName: 'OP-01',  language: 'en', grade: 'PSA 10' },
  { id: CARD_NAMI_ID,            name: 'Nami Rare',             ipCategory: 'one-piece', setName: 'OP-02',  language: 'ja', grade: 'RAW'    },
  { id: CARD_ACE_RARE_ID,        name: 'Portgas D. Ace Rare',   ipCategory: 'one-piece', setName: 'OP-02',  language: 'en', grade: 'PSA 9'  },
  { id: CARD_SHANKS_SEC_ID,      name: 'Red-Haired Shanks SR',  ipCategory: 'one-piece', setName: 'OP-01',  language: 'ja', grade: 'PSA 10' },
  { id: CARD_KAIDO_ID,           name: 'Kaido Secret Rare',     ipCategory: 'one-piece', setName: 'OP-04',  language: 'ja', grade: 'RAW'    },
  { id: CARD_ROBIN_ID,           name: 'Nico Robin Alt Art',    ipCategory: 'one-piece', setName: 'OP-03',  language: 'en', grade: 'RAW'    },
  { id: CARD_SANJI_ID,           name: 'Vinsmoke Sanji Rare',   ipCategory: 'one-piece', setName: 'OP-07',  language: 'en', grade: 'RAW'    },
  { id: CARD_USOPP_ID,           name: 'Usopp Common',          ipCategory: 'one-piece', setName: 'OP-01',  language: 'en', grade: 'RAW'    },
  { id: CARD_CHOPPER_ID,         name: 'Tony Tony Chopper',     ipCategory: 'one-piece', setName: 'OP-03',  language: 'ja', grade: 'RAW'    },
  { id: CARD_BROOK_ID,           name: 'Brook Rare',            ipCategory: 'one-piece', setName: 'OP-07',  language: 'en', grade: 'RAW'    },
  { id: CARD_FRANKY_ID,          name: 'Franky Common',         ipCategory: 'one-piece', setName: 'OP-07',  language: 'en', grade: 'RAW'    },

  // ── Sports ────────────────────────────────────────────────────────────────
  { id: CARD_TROUT_ROOKIE_ID,    name: 'Mike Trout Rookie',     ipCategory: 'sports', setName: '2011 Topps Update',   language: 'en', grade: 'PSA 10' },
  { id: CARD_OHTANI_AUTO_ID,     name: 'Shohei Ohtani Auto RC', ipCategory: 'sports', setName: '2018 Topps Chrome',   language: 'en', grade: 'BGS 9.5'},
  { id: CARD_JUDGE_RC_ID,        name: 'Aaron Judge Rookie',    ipCategory: 'sports', setName: '2017 Topps Chrome',   language: 'en', grade: 'PSA 9'  },
  { id: CARD_WEMBY_ROOKIE_ID,    name: 'Victor Wembanyama RC',  ipCategory: 'sports', setName: '2023 Prizm',          language: 'en', grade: 'PSA 10' },
  { id: CARD_LEBRON_LOGO_ID,     name: 'LeBron James Logo Man', ipCategory: 'sports', setName: '2003 Exquisite',      language: 'en', grade: 'PSA 9'  },
  { id: CARD_LUKA_PRIZM_ID,      name: 'Luka Doncic Prizm RC',  ipCategory: 'sports', setName: '2018 Prizm',          language: 'en', grade: 'BGS 9.5'},
  { id: CARD_SOTO_AUTO_ID,       name: 'Juan Soto Auto',        ipCategory: 'sports', setName: '2019 Bowman',         language: 'en', grade: 'PSA 10' },
  { id: CARD_MAHOMES_RC_ID,      name: 'Patrick Mahomes RC',    ipCategory: 'sports', setName: '2017 Panini Prizm',   language: 'en', grade: 'PSA 10' },
  { id: CARD_ACUNA_RC_ID,        name: 'Ronald Acuna Jr. RC',   ipCategory: 'sports', setName: '2018 Topps Update',   language: 'en', grade: 'PSA 9'  },
  { id: CARD_TATUM_PRIZM_ID,     name: 'Jayson Tatum Prizm RC', ipCategory: 'sports', setName: '2017 Prizm',          language: 'en', grade: 'RAW'    },
  { id: CARD_SHOHEI_BASE_ID,     name: 'Shohei Ohtani Base',    ipCategory: 'sports', setName: '2018 Topps',          language: 'en', grade: 'RAW'    },
  { id: CARD_CURRY_PRIZM_ID,     name: 'Stephen Curry Prizm',   ipCategory: 'sports', setName: '2012 Prizm',          language: 'en', grade: 'PSA 9'  },

  // ── Yu-Gi-Oh ──────────────────────────────────────────────────────────────
  { id: CARD_BLUE_EYES_ORIG_ID,  name: 'Blue-Eyes White Dragon 1st Ed', ipCategory: 'yugioh', setName: 'LOB',  language: 'en', grade: 'PSA 9'  },
  { id: CARD_DARK_MAGICIAN_ID,   name: 'Dark Magician 1st Ed',          ipCategory: 'yugioh', setName: 'LOB',  language: 'en', grade: 'PSA 8'  },
  { id: CARD_EXODIA_HEAD_ID,     name: 'Exodia the Forbidden One 1st',  ipCategory: 'yugioh', setName: 'LOB',  language: 'en', grade: 'PSA 10' },
  { id: CARD_RAIGEKI_ORIG_ID,    name: 'Raigeki 1st Ed',                ipCategory: 'yugioh', setName: 'LOB',  language: 'en', grade: 'PSA 9'  },
  { id: CARD_MONSTER_REBORN_ID,  name: 'Monster Reborn 1st Ed',         ipCategory: 'yugioh', setName: 'LOB',  language: 'en', grade: 'RAW'    },
  { id: CARD_POTE_AVARICE_ID,    name: 'Pot of Avarice',                ipCategory: 'yugioh', setName: 'AP01', language: 'en', grade: 'RAW'    },
  { id: CARD_BRANDED_FUSION_ID,  name: 'Branded Fusion Gold Rare',      ipCategory: 'yugioh', setName: 'DAMA', language: 'en', grade: 'PSA 10' },
  { id: CARD_NIBIRU_ID,          name: 'Nibiru, the Primal Being',      ipCategory: 'yugioh', setName: 'IGAS', language: 'en', grade: 'PSA 9'  },
  { id: CARD_ASH_BLOSSOM_ID,     name: 'Ash Blossom Ghost Rare',        ipCategory: 'yugioh', setName: 'DUSA', language: 'en', grade: 'RAW'    },
  { id: CARD_SOLEMN_JUDGMENT_ID, name: 'Solemn Judgment 1st Ed',        ipCategory: 'yugioh', setName: 'MRD',  language: 'en', grade: 'PSA 9'  },
  { id: CARD_LIGHTNING_STORM_ID, name: 'Lightning Storm Secret Rare',   ipCategory: 'yugioh', setName: 'IGAS', language: 'en', grade: 'RAW'    },
]

// ─── UserCards ────────────────────────────────────────────────────────────────
// VAULTED (~20): high-value graded cards in the Gacha vault
// EXTERNAL (~10): user-uploaded, not in vault
// ON_MARKET (~8): listed on marketplace
// IN_TRANSIT (~4): being shipped to vault

export const USER_CARDS = [
  // ── Alice (collector) — VAULTED ───────────────────────────────────────────
  {
    id: UC_001_ID, userId: USER_COLLECTOR_ID, cardId: CARD_CHARIZARD_VMAX_ID,
    state: CardState.VAULTED, estimatedValue: '5000.00', certNumber: 'PSA-12345678',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_002_ID, userId: USER_COLLECTOR_ID, cardId: CARD_MEWTWO_GX_ID,
    state: CardState.VAULTED, estimatedValue: '850.00', certNumber: 'PSA-23456789',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_003_ID, userId: USER_COLLECTOR_ID, cardId: CARD_PIKACHU_PROMO_ID,
    state: CardState.VAULTED, estimatedValue: '4500.00', certNumber: 'PSA-34567890',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_004_ID, userId: USER_COLLECTOR_ID, cardId: CARD_TROUT_ROOKIE_ID,
    state: CardState.VAULTED, estimatedValue: '1200.00', certNumber: 'PSA-45678901',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_005_ID, userId: USER_COLLECTOR_ID, cardId: CARD_WEMBY_ROOKIE_ID,
    state: CardState.VAULTED, estimatedValue: '900.00', certNumber: 'PSA-56789012',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_006_ID, userId: USER_COLLECTOR_ID, cardId: CARD_LUFFY_LEADER_ID,
    state: CardState.VAULTED, estimatedValue: '320.00',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_007_ID, userId: USER_COLLECTOR_ID, cardId: CARD_SHANKS_SEC_ID,
    state: CardState.VAULTED, estimatedValue: '750.00', certNumber: 'PSA-67890123',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_008_ID, userId: USER_COLLECTOR_ID, cardId: CARD_BLUE_EYES_ORIG_ID,
    state: CardState.VAULTED, estimatedValue: '2200.00', certNumber: 'PSA-78901234',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_009_ID, userId: USER_COLLECTOR_ID, cardId: CARD_EXODIA_HEAD_ID,
    state: CardState.VAULTED, estimatedValue: '1800.00', certNumber: 'PSA-89012345',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_010_ID, userId: USER_COLLECTOR_ID, cardId: CARD_OHTANI_AUTO_ID,
    state: CardState.VAULTED, estimatedValue: '3200.00', certNumber: 'BGS-90123456',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_011_ID, userId: USER_COLLECTOR_ID, cardId: CARD_GENGAR_VMAX_ID,
    state: CardState.VAULTED, estimatedValue: '480.00', certNumber: 'PSA-01234567',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_3D,
  },
  {
    id: UC_012_ID, userId: USER_COLLECTOR_ID, cardId: CARD_MAHOMES_RC_ID,
    state: CardState.VAULTED, estimatedValue: '1500.00', certNumber: 'PSA-11234567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },

  // ── Bob (flipper) — VAULTED ───────────────────────────────────────────────
  {
    id: UC_013_ID, userId: USER_FLIPPER_ID, cardId: CARD_CHARIZARD_GX_ID,
    state: CardState.VAULTED, estimatedValue: '650.00', certNumber: 'PSA-22234567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_014_ID, userId: USER_FLIPPER_ID, cardId: CARD_LEBRON_LOGO_ID,
    state: CardState.VAULTED, estimatedValue: '2800.00', certNumber: 'PSA-33234567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_015_ID, userId: USER_FLIPPER_ID, cardId: CARD_RAIGEKI_ORIG_ID,
    state: CardState.VAULTED, estimatedValue: '420.00', certNumber: 'PSA-44234567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_016_ID, userId: USER_FLIPPER_ID, cardId: CARD_LUKA_PRIZM_ID,
    state: CardState.VAULTED, estimatedValue: '950.00', certNumber: 'BGS-55234567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },

  // ── Alice — EXTERNAL ──────────────────────────────────────────────────────
  {
    id: UC_017_ID, userId: USER_COLLECTOR_ID, cardId: CARD_UMBREON_VMAX_ID,
    state: CardState.EXTERNAL, estimatedValue: '180.00',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_3D,
    userNotes: 'Bought at local shop, considering vaulting',
  },
  {
    id: UC_018_ID, userId: USER_COLLECTOR_ID, cardId: CARD_BLASTOISE_EX_ID,
    state: CardState.EXTERNAL, estimatedValue: '95.00', certNumber: 'PSA-66234567',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_3D,
  },
  {
    id: UC_019_ID, userId: USER_COLLECTOR_ID, cardId: CARD_ZORO_LEADER_ID,
    state: CardState.EXTERNAL, estimatedValue: '310.00', certNumber: 'PSA-77234567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_020_ID, userId: USER_COLLECTOR_ID, cardId: CARD_ACE_RARE_ID,
    state: CardState.EXTERNAL, estimatedValue: '75.00',
    priceConfidence: PriceConfidence.NO_DATA,
    userNotes: 'Pulled from OP-02 box',
  },
  {
    id: UC_021_ID, userId: USER_COLLECTOR_ID, cardId: CARD_SNORLAX_VMAX_ID,
    state: CardState.EXTERNAL, estimatedValue: '25.00',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_8D,
    userNotes: 'Kids collection, low priority',
  },

  // ── Bob — EXTERNAL ────────────────────────────────────────────────────────
  {
    id: UC_022_ID, userId: USER_FLIPPER_ID, cardId: CARD_SOTO_AUTO_ID,
    state: CardState.EXTERNAL, estimatedValue: '380.00', certNumber: 'PSA-88234567',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_3D,
    userNotes: 'Purchased from auction, sending to vault soon',
  },
  {
    id: UC_023_ID, userId: USER_FLIPPER_ID, cardId: CARD_ASH_BLOSSOM_ID,
    state: CardState.EXTERNAL, estimatedValue: '45.00',
    priceConfidence: PriceConfidence.NO_DATA,
    userNotes: 'Ghost rare pull, need to price check',
  },
  {
    id: UC_024_ID, userId: USER_FLIPPER_ID, cardId: CARD_LIGHTNING_STORM_ID,
    state: CardState.EXTERNAL, estimatedValue: '30.00',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_8D,
  },
  {
    id: UC_025_ID, userId: USER_FLIPPER_ID, cardId: CARD_JUDGE_RC_ID,
    state: CardState.EXTERNAL, estimatedValue: '280.00', certNumber: 'PSA-99234567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },

  // ── Carol — EXTERNAL ──────────────────────────────────────────────────────
  {
    id: UC_026_ID, userId: USER_NEW_ID, cardId: CARD_PIKACHU_V_ID,
    state: CardState.EXTERNAL, estimatedValue: '120.00', certNumber: 'BGS-00234567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
    userNotes: 'Birthday gift',
  },

  // ── Alice — ON_MARKET ─────────────────────────────────────────────────────
  {
    id: UC_027_ID, userId: USER_COLLECTOR_ID, cardId: CARD_RAYQUAZA_VMAX_ID,
    state: CardState.ON_MARKET, estimatedValue: '520.00', certNumber: 'PSA-11134567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_028_ID, userId: USER_COLLECTOR_ID, cardId: CARD_LUGIA_V_ID,
    state: CardState.ON_MARKET, estimatedValue: '290.00', certNumber: 'PSA-22134567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_029_ID, userId: USER_COLLECTOR_ID, cardId: CARD_KAIDO_ID,
    state: CardState.ON_MARKET, estimatedValue: '195.00',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_030_ID, userId: USER_COLLECTOR_ID, cardId: CARD_DARK_MAGICIAN_ID,
    state: CardState.ON_MARKET, estimatedValue: '380.00', certNumber: 'PSA-33134567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },

  // ── Bob — ON_MARKET ───────────────────────────────────────────────────────
  {
    id: UC_031_ID, userId: USER_FLIPPER_ID, cardId: CARD_BRANDED_FUSION_ID,
    state: CardState.ON_MARKET, estimatedValue: '85.00', certNumber: 'PSA-44134567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },
  {
    id: UC_032_ID, userId: USER_FLIPPER_ID, cardId: CARD_CURRY_PRIZM_ID,
    state: CardState.ON_MARKET, estimatedValue: '210.00', certNumber: 'PSA-55134567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_033_ID, userId: USER_FLIPPER_ID, cardId: CARD_NIBIRU_ID,
    state: CardState.ON_MARKET, estimatedValue: '65.00',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
  },
  {
    id: UC_034_ID, userId: USER_FLIPPER_ID, cardId: CARD_ACUNA_RC_ID,
    state: CardState.ON_MARKET, estimatedValue: '175.00', certNumber: 'PSA-66134567',
    priceConfidence: PriceConfidence.LIVE, priceFetchedAt: RECENT_1H,
  },

  // ── IN_TRANSIT: being shipped to vault ───────────────────────────────────
  {
    id: UC_035_ID, userId: USER_COLLECTOR_ID, cardId: CARD_MEW_VMAX_ID,
    state: CardState.IN_TRANSIT, estimatedValue: '340.00', certNumber: 'PSA-77134567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
    userNotes: 'Shipped 2026-03-01, tracking #1Z999AA10123456784',
  },
  {
    id: UC_036_ID, userId: USER_COLLECTOR_ID, cardId: CARD_TATUM_PRIZM_ID,
    state: CardState.IN_TRANSIT, estimatedValue: '55.00',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_3D,
    userNotes: 'Bundle shipment with Eevee V',
  },
  {
    id: UC_037_ID, userId: USER_FLIPPER_ID, cardId: CARD_SOLEMN_JUDGMENT_ID,
    state: CardState.IN_TRANSIT, estimatedValue: '280.00', certNumber: 'PSA-88134567',
    priceConfidence: PriceConfidence.RECENT_24H, priceFetchedAt: RECENT_12H,
    userNotes: 'High value, expedited vault shipping',
  },
  {
    id: UC_038_ID, userId: USER_COLLECTOR_ID, cardId: CARD_EEVEE_V_ID,
    state: CardState.IN_TRANSIT, estimatedValue: '40.00',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_3D,
    userNotes: 'Bundle shipment with Tatum Prizm',
  },

  // ── Additional VAULTED for card coverage ─────────────────────────────────
  {
    id: UC_039_ID, userId: USER_COLLECTOR_ID, cardId: CARD_VENUSAUR_EX_ID,
    state: CardState.VAULTED, estimatedValue: '5.00',
    priceConfidence: PriceConfidence.NO_DATA,
  },
  {
    id: UC_040_ID, userId: USER_COLLECTOR_ID, cardId: CARD_NAMI_ID,
    state: CardState.VAULTED, estimatedValue: '12.00',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_8D,
  },
  {
    id: UC_041_ID, userId: USER_COLLECTOR_ID, cardId: CARD_SHOHEI_BASE_ID,
    state: CardState.VAULTED, estimatedValue: '8.00',
    priceConfidence: PriceConfidence.NO_DATA,
  },
  {
    id: UC_042_ID, userId: USER_FLIPPER_ID, cardId: CARD_MONSTER_REBORN_ID,
    state: CardState.VAULTED, estimatedValue: '18.00',
    priceConfidence: PriceConfidence.STALE_7D, priceFetchedAt: STALE_8D,
  },
]

// ─── ExternalCards ────────────────────────────────────────────────────────────

export const EXTERNAL_CARDS = [
  {
    id: EC_001_ID,
    userId: USER_COLLECTOR_ID,
    name: 'Charizard Base Set Holo',
    setName: 'Base Set',
    grade: 'RAW',
    certNumber: undefined,
    estimatedValue: '350.00',
    priceConfidence: PriceConfidence.STALE_7D,
    priceFetchedAt: STALE_3D,
    userNotes: 'Childhood collection card, sentimental value',
  },
  {
    id: EC_002_ID,
    userId: USER_COLLECTOR_ID,
    name: 'Blastoise Base Set Holo',
    setName: 'Base Set',
    grade: 'RAW',
    certNumber: undefined,
    estimatedValue: '180.00',
    priceConfidence: PriceConfidence.NO_DATA,
    userNotes: 'Childhood collection card',
  },
  {
    id: EC_003_ID,
    userId: USER_COLLECTOR_ID,
    name: 'Luffy Gear 5 Secret Rare',
    setName: 'OP-09',
    grade: 'RAW',
    certNumber: undefined,
    estimatedValue: null,
    priceConfidence: PriceConfidence.NO_DATA,
    userNotes: 'Just pulled, need pricing data',
  },
  {
    id: EC_004_ID,
    userId: USER_FLIPPER_ID,
    name: 'Babe Ruth 1952 Topps',
    setName: '1952 Topps',
    grade: 'PSA 5',
    certNumber: 'PSA-12345001',
    estimatedValue: '4800.00',
    priceConfidence: PriceConfidence.RECENT_24H,
    priceFetchedAt: RECENT_12H,
    userNotes: 'Heritage buy, looking to flip if price rises',
  },
  {
    id: EC_005_ID,
    userId: USER_FLIPPER_ID,
    name: 'Blue-Eyes White Dragon Alternate',
    setName: 'BLAR',
    grade: 'RAW',
    certNumber: undefined,
    estimatedValue: '75.00',
    priceConfidence: PriceConfidence.STALE_7D,
    priceFetchedAt: STALE_8D,
  },
  {
    id: EC_006_ID,
    userId: USER_NEW_ID,
    name: 'Random Common Pokemon Card',
    setName: 'Scarlet & Violet',
    grade: 'RAW',
    certNumber: undefined,
    estimatedValue: '1.00',
    priceConfidence: PriceConfidence.NO_DATA,
    userNotes: 'First card, just getting started',
  },
]

// ─── Packs ────────────────────────────────────────────────────────────────────

export const PACKS = [
  {
    id: PACK_OBSIDIAN_ID,
    userId: USER_COLLECTOR_ID,
    name: 'Pokemon Obsidian Flames Booster Pack',
    ipCategory: 'pokemon',
    openedAt: new Date('2024-09-15T10:00:00Z'),
  },
  {
    id: PACK_ONEPIECE_ID,
    userId: USER_COLLECTOR_ID,
    name: 'One Piece OP-07 500 Years in the Future',
    ipCategory: 'one-piece',
    openedAt: null,
  },
]

// ─── PackCards ────────────────────────────────────────────────────────────────
// Link Pack 1 (Obsidian Flames) to 5 pokemon cards

export const PACK_CARDS = [
  { id: PC_001_ID, packId: PACK_OBSIDIAN_ID, cardId: CARD_GENGAR_VMAX_ID  },
  { id: PC_002_ID, packId: PACK_OBSIDIAN_ID, cardId: CARD_SNORLAX_VMAX_ID },
  { id: PC_003_ID, packId: PACK_OBSIDIAN_ID, cardId: CARD_EEVEE_V_ID      },
  { id: PC_004_ID, packId: PACK_OBSIDIAN_ID, cardId: CARD_MEW_VMAX_ID     },
  { id: PC_005_ID, packId: PACK_OBSIDIAN_ID, cardId: CARD_DRAGONITE_V_ID  },
]

// ─── MarketplaceListings ──────────────────────────────────────────────────────
// ON_MARKET cards: UC_027, UC_028, UC_029, UC_030, UC_031, UC_032, UC_033, UC_034

export const MARKETPLACE_LISTINGS = [
  {
    id: ML_001_ID,
    userCardId: UC_027_ID,
    listPrice: '549.99',
    status: 'ACTIVE',
    listedAt: new Date('2026-02-28T09:00:00Z'),
  },
  {
    id: ML_002_ID,
    userCardId: UC_028_ID,
    listPrice: '299.99',
    status: 'ACTIVE',
    listedAt: new Date('2026-03-01T14:30:00Z'),
  },
  {
    id: ML_003_ID,
    userCardId: UC_031_ID,
    listPrice: '89.99',
    status: 'ACTIVE',
    listedAt: new Date('2026-03-02T11:00:00Z'),
  },
  {
    id: ML_004_ID,
    userCardId: UC_032_ID,
    listPrice: '219.99',
    status: 'ACTIVE',
    listedAt: new Date('2026-03-03T08:00:00Z'),
  },
]

// ─── ActionsLog ───────────────────────────────────────────────────────────────

export const ACTIONS_LOG = [
  {
    id: AL_001_ID,
    userId: USER_COLLECTOR_ID,
    cardId: CARD_CHARIZARD_VMAX_ID,
    agentRecommended: {
      actionType: 'WATCHLIST',
      reasoning: 'Charizard VMAX PSA 10 is trending +12% this month. Hold and monitor.',
      confidence: 0.87,
      suggestedPrice: null,
    },
    userAction: 'ACCEPTED',
  },
  {
    id: AL_002_ID,
    userId: USER_FLIPPER_ID,
    cardId: CARD_LEBRON_LOGO_ID,
    agentRecommended: {
      actionType: 'LIST',
      reasoning: 'LeBron Logo Man PSA 9 at current $2800 is near 90-day high. Consider listing.',
      confidence: 0.74,
      suggestedPrice: 2950,
    },
    userAction: null,
  },
  {
    id: AL_003_ID,
    userId: USER_COLLECTOR_ID,
    cardId: CARD_UMBREON_VMAX_ID,
    agentRecommended: {
      actionType: 'SHIP_TO_VAULT',
      reasoning: 'Umbreon VMAX Alt Art RAW valued at $180 exceeds vault threshold. Vault for protection.',
      confidence: 0.92,
      suggestedPrice: null,
    },
    userAction: 'ACCEPTED',
  },
]
