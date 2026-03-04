import { describe, it, expect } from 'vitest';
import { scrubText, scrubCompliance } from '../compliance.js';

describe('scrubText', () => {
  it('detects "will increase in value" and replaces it', () => {
    const result = scrubText('This card will increase in value next year', 'rarity_signal');
    expect(result.text).not.toContain('will increase in value');
    expect(result.text).toContain('shows positive market signals');
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].field).toBe('rarity_signal');
    expect(result.violations[0].original).toMatch(/will increase in value/i);
    expect(result.violations[0].replacement).toMatch(/shows positive market signals/i);
  });

  it('detects "guaranteed return" and replaces it', () => {
    const result = scrubText('This is a guaranteed return on investment', 'liquidity_signal');
    expect(result.text).not.toContain('guaranteed return');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects "buy now" and replaces it', () => {
    const result = scrubText('You should buy now before prices go up', 'reasoning_bullets');
    expect(result.text).not.toContain('buy now');
    expect(result.text).toContain('consider acquiring');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects "sell immediately" and replaces it', () => {
    const result = scrubText('Sell immediately to maximize gains', 'rarity_signal');
    expect(result.text).not.toContain('sell immediately');
    expect(result.text).toContain('consider listing');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects "should buy" and replaces it', () => {
    const result = scrubText('You should buy this card', 'rarity_signal');
    expect(result.text).not.toContain('should buy');
    expect(result.text).toContain('you might consider');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects "should sell" and replaces it', () => {
    const result = scrubText('You should sell this card now', 'liquidity_signal');
    expect(result.text).not.toContain('should sell');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects "should hold" and replaces it', () => {
    const result = scrubText('You should hold for long term', 'why');
    expect(result.text).not.toContain('should hold');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects "investment advice" and replaces it', () => {
    const result = scrubText('This is not investment advice but...', 'reasoning_bullets');
    expect(result.text).not.toContain('investment advice');
    expect(result.text).toContain('market observations');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects "profit" and replaces it', () => {
    const result = scrubText('You can make a profit on this card', 'rarity_signal');
    expect(result.text).not.toContain('profit');
    expect(result.text).toContain('potential value');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('returns original text with empty violations for clean text', () => {
    const clean = 'This Charizard VMAX shows strong market signals across recent sales.';
    const result = scrubText(clean, 'rarity_signal');
    expect(result.text).toBe(clean);
    expect(result.violations).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const result = scrubText('BUY NOW before prices rise', 'rarity_signal');
    expect(result.text).not.toContain('BUY NOW');
    expect(result.violations.length).toBeGreaterThan(0);
  });
});

describe('scrubCompliance', () => {
  it('scans only narrativeFields keys', () => {
    const data = {
      card_id: 'card-123',
      rarity_signal: 'This will increase in value',
      confidence: 0.9,
    };
    const result = scrubCompliance(data, ['rarity_signal']);
    // rarity_signal was scrubbed
    expect((result.data as typeof data).rarity_signal).not.toContain('will increase in value');
    // card_id untouched
    expect((result.data as typeof data).card_id).toBe('card-123');
  });

  it('skips numeric fields even if listed', () => {
    const data = {
      confidence: 0.95,
      rarity_signal: 'Clean signal text',
    };
    const result = scrubCompliance(data, ['confidence', 'rarity_signal']);
    expect((result.data as typeof data).confidence).toBe(0.95);
    expect(result.violations).toHaveLength(0);
  });

  it('handles array fields like reasoning_bullets with violations', () => {
    const data = {
      reasoning_bullets: [
        'This card will increase in value',
        'Strong demand across regions',
      ],
    };
    const result = scrubCompliance(data, ['reasoning_bullets']);
    const bullets = (result.data as typeof data).reasoning_bullets;
    expect(bullets[0]).not.toContain('will increase in value');
    expect(bullets[1]).toBe('Strong demand across regions');
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('returns all violations collected across multiple fields', () => {
    const data = {
      rarity_signal: 'This will increase in value',
      liquidity_signal: 'Buy now to maximize gains',
    };
    const result = scrubCompliance(data, ['rarity_signal', 'liquidity_signal']);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('handles full CardAnalysis-like object leaving id and tags untouched', () => {
    const cardAnalysis = {
      card_id: 'card-abc',
      identity_tags: ['pokemon', 'charizard'],
      rarity_signal: 'You should buy this before prices rise. Profit awaits.',
      liquidity_signal: 'High liquidity - sell immediately while demand is strong.',
      reasoning_bullets: [
        'Will increase in value over time.',
        'Strong collector base.',
      ],
      confidence: 0.87,
    };
    const narrativeFields = ['rarity_signal', 'liquidity_signal', 'reasoning_bullets'];
    const result = scrubCompliance(cardAnalysis, narrativeFields);
    const d = result.data as typeof cardAnalysis;

    // id and tags untouched
    expect(d.card_id).toBe('card-abc');
    expect(d.identity_tags).toEqual(['pokemon', 'charizard']);
    // confidence untouched
    expect(d.confidence).toBe(0.87);
    // violations found in narrative fields
    expect(result.violations.length).toBeGreaterThan(0);
    // scrubbed text
    expect(d.rarity_signal).not.toContain('should buy');
    expect(d.rarity_signal).not.toContain('Profit');
    expect(d.liquidity_signal).not.toContain('sell immediately');
  });
});
