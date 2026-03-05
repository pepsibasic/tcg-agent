/**
 * Prompt-schema contract tests.
 *
 * Purpose: These tests are the "canary" that catches future prompt-schema drift
 * before it reaches production. If someone edits a prompt field name or adds/removes
 * a schema key, the contract test fails loudly.
 *
 * Strategy: string-match the rendered user prompt text against each schema key that
 * the LLM is responsible for producing. This is resilient to ordering changes but
 * catches both additions and removals.
 */

import { describe, it, expect } from 'vitest';
import { PROMPTS } from '../prompts.js';
import {
  CardAnalysisSchema,
  PortfolioSummaryLLMSchema,
  CollectorArchetypeSchema,
} from '@tcg/schemas';

// ---------------------------------------------------------------------------
// card_analysis contract
// ---------------------------------------------------------------------------

describe('card_analysis prompt-schema contract', () => {
  const userPrompt = PROMPTS['card_analysis'].user;

  it('prompt mentions every LLM-produced field in CardAnalysisSchema', () => {
    // Fields the LLM is responsible for (card_id is orchestrator-injected)
    const llmFields = [
      'identity_tags',
      'rarity_signal',
      'liquidity_signal',
      'price_band',
      'reasoning_bullets',
      'confidence',
    ];
    for (const field of llmFields) {
      expect(userPrompt, `prompt missing field: ${field}`).toContain(field);
    }
  });

  it('prompt does NOT mention card_id (orchestrator-injected)', () => {
    // card_id is injected by the orchestrator, not produced by the LLM.
    // The prompt should not instruct the LLM to output it.
    expect(userPrompt).not.toContain('card_id');
  });

  it('a valid sample object passes CardAnalysisSchema.safeParse()', () => {
    const sample = {
      card_id: 'card-abc-123', // orchestrator-injected field required by full schema
      identity_tags: ['pokemon', 'holo', 'first-edition'],
      rarity_signal: 'High scarcity — few PSA 10s in circulation',
      liquidity_signal: 'Strong trading volume on major platforms',
      price_band: { low: 4500, high: 5500, currency: 'USD' },
      reasoning_bullets: [
        'Base Set Charizard holds iconic status among Pokemon collectors',
        'PSA 10 population is limited at roughly 3% of all graded copies',
        'Secondary market velocity remains high year-round',
      ],
      confidence: 'HIGH' as const,
    };

    const result = CardAnalysisSchema.safeParse(sample);
    expect(result.success).toBe(true);
    if (!result.success) {
      // Surface validation errors for debugging
      expect(result.error.issues).toEqual([]);
    }
  });

  it('price_band can be null (CardAnalysisSchema allows null)', () => {
    const sample = {
      card_id: 'card-xyz',
      identity_tags: ['yugioh'],
      rarity_signal: 'Unknown',
      liquidity_signal: 'Thin market',
      price_band: null,
      reasoning_bullets: ['Limited data available'],
      confidence: 'LOW' as const,
    };
    const result = CardAnalysisSchema.safeParse(sample);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// portfolio_summary contract
// ---------------------------------------------------------------------------

describe('portfolio_summary prompt-schema contract', () => {
  const userPrompt = PROMPTS['portfolio_summary'].user;

  it('prompt mentions every key in PortfolioSummaryLLMSchema (5 fields)', () => {
    // These are the 5 fields the LLM produces — the narrow schema for generateWithRetry
    const llmFields = Object.keys(PortfolioSummaryLLMSchema.shape);
    expect(llmFields).toHaveLength(5);

    for (const field of llmFields) {
      expect(userPrompt, `prompt missing field: ${field}`).toContain(field);
    }
  });

  it('PortfolioSummaryLLMSchema has exactly 5 fields (not the full 10-field schema)', () => {
    const keys = Object.keys(PortfolioSummaryLLMSchema.shape);
    expect(keys).toEqual(
      expect.arrayContaining([
        'concentrationScore',
        'liquidityScore',
        'collectorArchetype',
        'missingSetGoals',
        'recommendedActions',
      ])
    );
    expect(keys).toHaveLength(5);
  });

  it('prompt does NOT instruct LLM to produce orchestrator-computed fields', () => {
    // These fields are computed by the orchestrator from the DB — not LLM outputs
    const orchestratorFields = [
      'userId',
      'totalValueEst',
      'breakdown',
      'priceDataAsOf',
      'priceConfidence',
    ];
    for (const field of orchestratorFields) {
      // The prompt may reference userId as input context (User ID: {{user_id}}) but
      // must NOT instruct the LLM to produce it as an output field
      const fieldInOutputSection = userPrompt
        .split('Produce a JSON object')[1] ?? '';
      expect(
        fieldInOutputSection,
        `prompt output section should not instruct LLM to produce: ${field}`
      ).not.toContain(field);
    }
  });

  it('.shape keys of PortfolioSummaryLLMSchema exactly match fields instructed in prompt output section', () => {
    const schemaKeys = Object.keys(PortfolioSummaryLLMSchema.shape);
    const outputSection = userPrompt.split('Produce a JSON object')[1] ?? '';

    for (const key of schemaKeys) {
      expect(
        outputSection,
        `schema key "${key}" not found in prompt output section`
      ).toContain(key);
    }
  });

  it('a valid 5-field sample object passes PortfolioSummaryLLMSchema.safeParse()', () => {
    // Only the 5 LLM-generated fields — orchestrator merges DB-computed fields after
    const sample = {
      concentrationScore: 0.72,
      liquidityScore: 0.45,
      collectorArchetype: 'Pokemon Specialist',
      missingSetGoals: ['Base Set Shadowless', 'Neo Genesis'],
      recommendedActions: [
        'Consider diversifying beyond Pokemon to reduce concentration risk',
        'Top 3 cards by value represent 68% of portfolio — monitor closely',
      ],
    };

    const result = PortfolioSummaryLLMSchema.safeParse(sample);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect(result.error.issues).toEqual([]);
    }
  });

  it('collectorArchetype can be null (PortfolioSummaryLLMSchema allows null)', () => {
    const sample = {
      concentrationScore: 0.5,
      liquidityScore: 0.5,
      collectorArchetype: null,
      missingSetGoals: [],
      recommendedActions: ['Add more cards to get a clearer archetype signal'],
    };
    const result = PortfolioSummaryLLMSchema.safeParse(sample);
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// archetype_identity contract
// ---------------------------------------------------------------------------

describe('archetype_identity prompt-schema contract', () => {
  const userPrompt = PROMPTS['archetype_identity'].user;

  it('prompt mentions every schema key in CollectorArchetypeSchema', () => {
    const schemaKeys = Object.keys(CollectorArchetypeSchema.shape);
    for (const key of schemaKeys) {
      expect(userPrompt, `prompt missing field: ${key}`).toContain(key);
    }
  });

  it('prompt uses share_card_badges (not bare "badges") as a field instruction', () => {
    const outputSection = userPrompt.split('Produce a JSON object')[1] ?? '';
    // The full prefixed name must appear in the output instructions as a field
    expect(outputSection).toContain('share_card_badges');
    // A bare "- badges:" field definition (without the required share_card_ prefix)
    // must NOT appear in the output section — this is the pre-06-01 bug pattern
    expect(outputSection).not.toMatch(/^- badges:/m);
  });

  it('a valid sample object passes CollectorArchetypeSchema.safeParse()', () => {
    const sample = {
      name: 'The Vault Guardian',
      traits: [
        'Long-term thinker',
        'Values preservation over quick profit',
        'Builds for legacy',
        'Research-driven',
      ],
      why: 'This collector has consistently moved high-value cards to vault storage, signaling a preservation-first philosophy. Their action history shows patience — no impulsive listings even during market peaks.',
      comparable_collectors: ['Museum-style collectors', 'Blue-chip art investors'],
      share_card_text:
        'The Vault Guardian: protecting tomorrow\'s treasures today. Your collection is a legacy in the making.',
      share_card_badges: ['vault_builder', 'ip_specialist'],
    };

    const result = CollectorArchetypeSchema.safeParse(sample);
    expect(result.success).toBe(true);
    if (!result.success) {
      expect(result.error.issues).toEqual([]);
    }
  });
});
