/**
 * Prompt template registry with slot injection rendering.
 *
 * Templates define the LLM's output personality and structure.
 * System persona: knowledgeable card market analyst, never financial advice.
 */

export type PromptTemplate = {
  system: string;
  user: string;
  requiredSlots: string[];
};

export const SYSTEM_PERSONA =
  'You are a knowledgeable card market analyst. Be direct, data-informed, and engaging. ' +
  'Never give financial advice. Use signals language. ' +
  'When a field value is unknown, return null (not omit the field).';

export const PROMPTS: Record<string, PromptTemplate> = {
  card_analysis: {
    system: SYSTEM_PERSONA,
    user: `Analyze the following trading card and produce a structured analysis.

Card: {{card_name}}
Set: {{card_set}}
Grade/Condition: {{card_grade}}
Current State: {{card_state}}
Estimated Value: {{estimated_value}}
Price Confidence: {{price_confidence}}
User Notes: {{user_notes}}

Produce a JSON object with EXACTLY these fields (return null — not omit — for unknown fields):
- identity_tags: string[] — descriptive tags (e.g., ["pokemon", "holo", "first-edition"])
- rarity_signal: string | null — market scarcity observations using signals language
- liquidity_signal: string | null — how actively this card trades
- price_band: { low: number, high: number, currency: string } | null — estimated price range with currency code (e.g., "USD")
- reasoning_bullets: string[] — 2-4 analytical observations about market position, demand, and trends
- confidence: 'HIGH' | 'MEDIUM' | 'LOW' — your confidence in this analysis

Style: Analytical with personality — like a knowledgeable friend, not a robot. Example tone: "Charizard VMAX PSA 10 sits in the top tier of modern Pokemon chase cards. Market activity is strong — recent comps suggest strong demand."`,
    requiredSlots: [
      'card_name',
      'card_set',
      'card_grade',
      'card_state',
      'estimated_value',
      'price_confidence',
      'user_notes',
    ],
  },

  portfolio_summary: {
    system: SYSTEM_PERSONA,
    user: `Analyze the following card portfolio and produce a structured summary.

User ID: {{user_id}}
Total Cards: {{total_count}}
Vaulted Cards: {{vaulted_count}}
External Cards: {{external_count}}
Portfolio Data (JSON): {{cards_json}}

Produce a JSON object with EXACTLY these fields (return null — not omit — for unknown fields):
- concentrationScore: number — 0.0 to 1.0, higher means portfolio is more concentrated in fewer IPs/sets
- liquidityScore: number — 0.0 to 1.0, higher means portfolio is more liquid (more vaulted, actively traded cards)
- collectorArchetype: string | null — one-line archetype label (e.g., "Pokemon Specialist", "Diverse Collector"), or null if unclear
- missingSetGoals: string[] — 0-3 notable gaps in the collection the user might want to fill
- recommendedActions: string[] — 2-3 actionable next steps using signals language, no financial advice

Style: Key insights + recommendations. 2-3 sentence overview highlighting concentration risk, strongest IP, and top recommendation. Actionable, not exhaustive.`,
    requiredSlots: [
      'user_id',
      'cards_json',
      'total_count',
      'vaulted_count',
      'external_count',
    ],
  },

  archetype_identity: {
    system: SYSTEM_PERSONA,
    user: `Based on the following collector's portfolio and behavior, identify their collector archetype.

User ID: {{user_id}}
Top IPs/Sets: {{top_ips}}
Action History: {{action_history}}
Portfolio Summary (JSON): {{portfolio_summary_json}}

Produce a JSON object with EXACTLY these fields (return null — not omit — for unknown fields):
- name: string — memorable archetype name (e.g., "The Vault Guardian", "The Flipper")
- traits: string[] — 3-5 personality traits of this collector type
- why: string | null — 2-3 sentence explanation of why this collector fits this archetype (signals language, no financial advice)
- comparable_collectors: string[] | null — types of collectors this person is similar to
- share_card_text: string | null — fun, shareable 1-2 sentence description for social sharing
- share_card_badges: string[] — earned achievement badges (e.g., ["vault_builder", "ip_specialist"])

Style: Fun and shareable — memorable names, personality-driven descriptions made for sharing. Think "The Vault Guardian" not "Conservative collector."`,
    requiredSlots: [
      'user_id',
      'portfolio_summary_json',
      'top_ips',
      'action_history',
    ],
  },
};

/**
 * Render a prompt template by filling all required slots.
 *
 * @param templateKey - Key in PROMPTS registry
 * @param slots - Map of slot name to value
 * @returns Rendered { system, user } strings
 * @throws If templateKey is unknown or a required slot is missing
 */
export function renderPrompt(
  templateKey: string,
  slots: Record<string, string>
): { system: string; user: string } {
  const template = PROMPTS[templateKey];
  if (!template) {
    throw new Error(`Unknown prompt template: "${templateKey}". Available templates: ${Object.keys(PROMPTS).join(', ')}`);
  }

  const missingSlots = template.requiredSlots.filter((slot) => !(slot in slots));
  if (missingSlots.length > 0) {
    throw new Error(
      `Missing required slot(s) for template "${templateKey}": ${missingSlots.map((s) => `{{${s}}}`).join(', ')}`
    );
  }

  let user = template.user;
  for (const [key, value] of Object.entries(slots)) {
    user = user.replaceAll(`{{${key}}}`, value);
  }

  return {
    system: template.system,
    user,
  };
}
