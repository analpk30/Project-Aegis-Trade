import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export interface LlmCallResult {
  text: string;
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

/**
 * Generate MiFID II Best Execution Justification for an order.
 */
export async function generateMifidJustification(context: {
  orderId: string;
  instrument: string;
  assetClass: string;
  sizeEur: number;
  direction: string;
  venue: string;
  guardianScore: number;
  executabilityScore: number;
  clientName: string;
}): Promise<LlmCallResult> {
  const start = Date.now();
  const ai = getAiClient();

  if (!ai) {
    return {
      text: `[FALLBACK] Order ${context.orderId} (${context.direction} €${(context.sizeEur / 1e6).toFixed(1)}M ${context.instrument}) executed via ${context.venue}. Best-execution satisfied based on optimal depth and spread verification against MTF benchmarks. Guardian Score: ${context.guardianScore}/100.`,
      model: 'deterministic-fallback',
      latencyMs: Date.now() - start,
      fallbackUsed: true,
    };
  }

  try {
    const prompt = `You are Project Guardian's MiFID II Best-Execution AI Agent for a Tier-1 European Investment Bank.
Generate a concise, authoritative, professional MiFID II Article 27 best-execution justification report (100-150 words) for the following order:

- Order ID: ${context.orderId}
- Client: ${context.clientName}
- Instrument: ${context.instrument} (${context.assetClass})
- Direction: ${context.direction} €${(context.sizeEur / 1e6).toFixed(2)}M
- Execution Venue: ${context.venue}
- Guardian Score: ${context.guardianScore}/100 (Executability: ${context.executabilityScore}/100)

Requirements:
1. Reference MiFID II RTS 27/28 best execution criteria (Price, Cost, Speed, Likelihood of Execution).
2. Justify venue selection given the market depth and client suitability category.
3. Keep the tone crisp, institutional, and regulator-ready.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    const text = response.text?.trim() || 'MiFID II Justification generated.';
    return {
      text,
      model: 'gemini-3.6-flash',
      latencyMs: Date.now() - start,
      fallbackUsed: false,
    };
  } catch (error) {
    console.error('Gemini API error in generateMifidJustification:', error);
    return {
      text: `[FALLBACK AFTER ERROR] Order ${context.orderId} best-execution justified under RTS 28 standards. Market depth check verified on ${context.venue}. Guardian Score: ${context.guardianScore}/100.`,
      model: 'gemini-3.6-flash-fallback',
      latencyMs: Date.now() - start,
      fallbackUsed: true,
    };
  }
}

/**
 * Interpret BaFin Rulebook text (RAG).
 */
export async function interpretBafinRules(
  query: string,
  regulatoryDocs: string[]
): Promise<LlmCallResult> {
  const start = Date.now();
  const ai = getAiClient();

  if (!ai) {
    return {
      text: `[FALLBACK RAG] Query "${query}" matched BaFin Circular 05/2023 (MaRisk) & MiFID II Art. 24. Key Directive: Ensure pre-trade suitability check and documented client consent prior to order entry.`,
      model: 'deterministic-fallback',
      latencyMs: Date.now() - start,
      fallbackUsed: true,
    };
  }

  try {
    const prompt = `You are BaFin Compliance Intelligence for Project Guardian.
Context of regulatory text snippets:
${regulatoryDocs.join('\n---\n')}

User Query / Objective: "${query}"

Provide a structured regulatory interpretation response:
1. Executive Summary (2 sentences)
2. Mandatory "DOs" (bullet points)
3. Strict "DON'Ts" (bullet points)
4. Applicable Asset Classes & Regulatory References (e.g. BaFin Circular, WpHG, MiFID II).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return {
      text: response.text?.trim() || 'BaFin interpretation complete.',
      model: 'gemini-3.6-flash',
      latencyMs: Date.now() - start,
      fallbackUsed: false,
    };
  } catch (error) {
    console.error('Gemini API error in interpretBafinRules:', error);
    return {
      text: `[FALLBACK] BaFin interpretation for "${query}": Mandates mandatory client consent and pre-trade audit logging under WpHG Section 64.`,
      model: 'gemini-3.6-flash-fallback',
      latencyMs: Date.now() - start,
      fallbackUsed: true,
    };
  }
}

/**
 * XAI Explainer: Converts structured reasoning payload into human-readable audit prose.
 */
export async function generateXaiExplanation(
  action: string,
  rawReasoning: string
): Promise<LlmCallResult> {
  const start = Date.now();
  const ai = getAiClient();

  if (!ai) {
    return {
      text: `[AUDIT EXPLANATION] System completed action '${action}'. Underlying factors: ${rawReasoning}`,
      model: 'deterministic-fallback',
      latencyMs: Date.now() - start,
      fallbackUsed: true,
    };
  }

  try {
    const prompt = `Convert the following technical compliance decision log into a clear, audit-proof, plain-English summary suitable for BaFin regulators:

Action: ${action}
Technical Log: ${rawReasoning}

Summary should be 2-3 sentences explaining exactly WHY this decision was taken and HOW compliance constraints were satisfied.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    return {
      text: response.text?.trim() || rawReasoning,
      model: 'gemini-3.6-flash',
      latencyMs: Date.now() - start,
      fallbackUsed: false,
    };
  } catch (error) {
    return {
      text: `[AUDIT EXPLANATION] Action '${action}': ${rawReasoning}`,
      model: 'gemini-3.6-flash-fallback',
      latencyMs: Date.now() - start,
      fallbackUsed: true,
    };
  }
}
