import { describe, it, expect } from 'vitest';
import { PROMPTS, SYSTEM_PERSONA, renderPrompt } from '../prompts.js';

describe('PROMPTS registry', () => {
  it('has all 3 required keys', () => {
    expect(PROMPTS).toHaveProperty('card_analysis');
    expect(PROMPTS).toHaveProperty('portfolio_summary');
    expect(PROMPTS).toHaveProperty('archetype_identity');
  });

  it.each(['card_analysis', 'portfolio_summary', 'archetype_identity'] as const)(
    '%s template system starts with SYSTEM_PERSONA',
    (key) => {
      expect(PROMPTS[key].system).toBe(SYSTEM_PERSONA);
    }
  );

  it.each(['card_analysis', 'portfolio_summary', 'archetype_identity'] as const)(
    '%s template system contains Never give financial advice',
    (key) => {
      expect(PROMPTS[key].system).toContain('Never give financial advice');
    }
  );

  it.each(['card_analysis', 'portfolio_summary', 'archetype_identity'] as const)(
    '%s template instructs returning null for unknown fields',
    (key) => {
      const template = PROMPTS[key];
      const combined = template.system + template.user;
      expect(combined.toLowerCase()).toContain('null');
    }
  );
});

describe('renderPrompt', () => {
  it('fills all slots correctly for card_analysis', () => {
    const slots = {
      card_name: 'Charizard',
      card_set: 'Base Set',
      card_grade: 'PSA 10',
      card_state: 'VAULTED',
      estimated_value: '5000',
      price_confidence: 'HIGH',
      user_notes: 'Love this card',
    };
    const result = renderPrompt('card_analysis', slots);
    expect(result.user).toContain('Charizard');
    expect(result.user).toContain('Base Set');
    expect(result.user).toContain('PSA 10');
    expect(result.system).toBe(SYSTEM_PERSONA);
  });

  it('fills all slots correctly for portfolio_summary', () => {
    const slots = {
      user_id: 'user-123',
      cards_json: '[]',
      total_count: '5',
      vaulted_count: '3',
      external_count: '2',
    };
    const result = renderPrompt('portfolio_summary', slots);
    expect(result.user).toContain('user-123');
    expect(result.user).toContain('5');
    expect(result.system).toBe(SYSTEM_PERSONA);
  });

  it('fills all slots correctly for archetype_identity', () => {
    const slots = {
      user_id: 'user-456',
      portfolio_summary_json: '{}',
      top_ips: 'Pokemon',
      action_history: 'vaulted 3 cards',
    };
    const result = renderPrompt('archetype_identity', slots);
    expect(result.user).toContain('user-456');
    expect(result.user).toContain('Pokemon');
    expect(result.system).toBe(SYSTEM_PERSONA);
  });

  it('throws descriptive error on missing required slot', () => {
    expect(() =>
      renderPrompt('card_analysis', {
        card_name: 'Charizard',
        // missing other required slots
      })
    ).toThrow(/missing.*slot|required.*slot|slot.*missing/i);
  });

  it('does not throw with extra unused slots', () => {
    const slots = {
      card_name: 'Pikachu',
      card_set: 'Jungle',
      card_grade: 'RAW',
      card_state: 'EXTERNAL',
      estimated_value: '20',
      price_confidence: 'LOW',
      user_notes: '',
      extra_field: 'ignored',
    };
    expect(() => renderPrompt('card_analysis', slots)).not.toThrow();
  });

  it('throws on unknown template key', () => {
    expect(() => renderPrompt('unknown_template', {})).toThrow();
  });
});
