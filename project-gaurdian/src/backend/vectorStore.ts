import { FineCase, PreCrimeMatch } from '../types';

/**
 * Utility: Compute Cosine Similarity between two numerical vectors of same dimension.
 * returns value between -1.0 and 1.0 (typically 0.0 to 1.0 for normalized feature vectors).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 8-dimensional feature vector structure:
// [ sizeFactor, spreadFactor, offMarketFactor, commsFlag, retailFlag, highYieldFlag, unverifiedKycFlag, highFrequencyFlag ]

export const SEEDED_FINE_CASES: FineCase[] = [
  {
    id: 'CASE-2015-LIBOR',
    caseName: 'LIBOR Benchmark Manipulation (2015)',
    caseYear: 2015,
    category: 'Benchmark & Rate Fixing',
    regulator: 'BaFin / FCA',
    fineAmount: '€450 Million',
    description: 'Traders colluded via chat rooms to submit artificial benchmark rates influencing EURIBOR/LIBOR fixings.',
    keyPattern: 'Off-market quotes submitted near fix window + trader comms referencing benchmark offsets.',
    mitigationStrategy: 'Halt automated execution on rate fixings; trigger 1st Line Compliance review immediately.',
    vector: [0.85, 0.92, 0.88, 0.95, 0.10, 0.40, 0.20, 0.80],
  },
  {
    id: 'CASE-2018-MBS',
    caseName: 'MBS Mismarking & Illiquid Asset Valuation (2018)',
    caseYear: 2018,
    category: 'Valuation & Mismarking',
    regulator: 'SEC / BaFin',
    fineAmount: '€180 Million',
    description: 'Structured credit desk overvalued subprime mortgage-backed securities to disguise inventory losses.',
    keyPattern: 'High size transactions in illiquid credit instruments executed >150bps off fair value mark.',
    mitigationStrategy: 'Mandate independent risk controller price verification before booking trade.',
    vector: [0.90, 0.85, 0.95, 0.30, 0.15, 0.90, 0.10, 0.20],
  },
  {
    id: 'CASE-2021-AML',
    caseName: 'Cross-Border Wealth AML Structural Failure (2021)',
    caseYear: 2021,
    category: 'AML & Customer Due Diligence',
    regulator: 'BaFin',
    fineAmount: '€320 Million',
    description: 'Unvetted offshore holding companies routed €100M+ FX swaps without verified ultimate beneficial owners.',
    keyPattern: 'High volume FX/Rates orders routed for clients with EXPIRED or PENDING KYC status.',
    mitigationStrategy: 'Block order flow instantly until UBO documentation and GwG compliance clearance is uploaded.',
    vector: [0.75, 0.20, 0.30, 0.50, 0.10, 0.30, 0.98, 0.40],
  },
  {
    id: 'CASE-2022-FRONTRUN',
    caseName: 'Block Order Front-Running & Information Leakage (2022)',
    caseYear: 2022,
    category: 'Market Abuse (MAR)',
    regulator: 'BaFin / ESMA',
    fineAmount: '€95 Million',
    description: 'Prop desk executed personal/firm hedge trades milliseconds prior to executing client €50M+ block order.',
    keyPattern: 'Prop/hedge order placed in same instrument within 30 seconds preceding large client order.',
    mitigationStrategy: 'Enforce strict Chinese wall & order queue time lock; auto-suspend prop trading on active client block.',
    vector: [0.95, 0.70, 0.60, 0.80, 0.05, 0.50, 0.05, 0.95],
  },
  {
    id: 'CASE-2023-SPOOF',
    caseName: 'High-Frequency Quote Spoofing & Layering (2023)',
    caseYear: 2023,
    category: 'Order Book Manipulation',
    regulator: 'BaFin',
    fineAmount: '€60 Million',
    description: 'Rapid creation and cancellation of non-bona fide orders to artificially move order book depth.',
    keyPattern: 'High order-to-trade ratio (>50:1) with rapid cancellation times under 500ms.',
    mitigationStrategy: 'Throttle algo order entry rate and flag desk to Market Abuse Surveillance.',
    vector: [0.40, 0.50, 0.70, 0.20, 0.05, 0.20, 0.05, 0.99],
  },
];

/**
 * Helper to turn order properties into an 8-dimensional feature vector.
 */
export function buildOrderVector(order: {
  sizeEur: number;
  assetClass: string;
  kycStatus: string;
  amlRiskLevel: string;
  commsText?: string;
  isOffMarket?: boolean;
}): number[] {
  const sizeFactor = Math.min(1.0, order.sizeEur / 60_000_000);
  const spreadFactor = order.isOffMarket ? 0.9 : 0.2;
  const offMarketFactor = order.isOffMarket ? 0.95 : 0.15;

  let commsFlag = 0.1;
  if (order.commsText) {
    const lower = order.commsText.toLowerCase();
    if (lower.includes('fix') || lower.includes('benchmark') || lower.includes('offset') || lower.includes('chat')) {
      commsFlag = 0.92;
    } else if (lower.includes('urgent') || lower.includes('off the book') || lower.includes('discount')) {
      commsFlag = 0.75;
    }
  }

  const retailFlag = order.assetClass === 'Equities' ? 0.3 : 0.05;
  const highYieldFlag = order.assetClass === 'Credit' ? 0.85 : 0.2;
  const unverifiedKycFlag = order.kycStatus === 'EXPIRED' ? 0.95 : order.kycStatus === 'PENDING' ? 0.60 : 0.05;
  const highFrequencyFlag = order.sizeEur > 30_000_000 ? 0.85 : 0.3;

  return [
    sizeFactor,
    spreadFactor,
    offMarketFactor,
    commsFlag,
    retailFlag,
    highYieldFlag,
    unverifiedKycFlag,
    highFrequencyFlag,
  ];
}

/**
 * Searches vector store for top matching fine case.
 */
export function matchPreCrimePattern(orderVector: number[]): PreCrimeMatch {
  let topCase = SEEDED_FINE_CASES[0];
  let maxSimilarity = -1;

  for (const c of SEEDED_FINE_CASES) {
    const sim = cosineSimilarity(orderVector, c.vector);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
      topCase = c;
    }
  }

  // Round similarity score cleanly to 3 decimals
  const similarityScore = Math.round(maxSimilarity * 1000) / 1000;

  return {
    caseId: topCase.id,
    caseName: topCase.caseName,
    caseYear: topCase.caseYear,
    regulator: topCase.regulator,
    similarityScore,
    category: topCase.category,
    matchedPattern: topCase.keyPattern,
    recommendedAction: topCase.mitigationStrategy,
    fineAmount: topCase.fineAmount,
  };
}
