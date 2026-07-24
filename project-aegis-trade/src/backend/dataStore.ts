import {
  BaFinAnnouncement,
  ClientPassport,
  ExecutiveMetrics,
  GuardianIdea,
  HedgeOption,
  MarketAnomaly,
  Order,
  PersonaRole,
} from '../types';
import { computeGuardianScore } from './scoringEngine';
import { buildOrderVector, matchPreCrimePattern } from './vectorStore';

// In-Memory Data Store representing persistent state
export class DataStore {
  public orders: Order[] = [];
  public clients: ClientPassport[] = [];
  public bafinAnnouncements: BaFinAnnouncement[] = [];
  public ideas: GuardianIdea[] = [];
  public anomalies: MarketAnomaly[] = [];
  public hedges: HedgeOption[] = [];
  public executiveMetrics!: ExecutiveMetrics;

  constructor() {
    this.seedClients();
    this.seedOrders();
    this.seedBafin();
    this.seedIdeas();
    this.seedAnomalies();
    this.seedHedges();
    this.seedExecutiveMetrics();
  }

  private seedClients() {
    this.clients = [
      {
        id: 'CL-DE-9081',
        name: 'Allianz Global Investors SE',
        entityType: 'Institutional',
        kycStatus: 'VERIFIED',
        amlRiskLevel: 'LOW',
        suitabilityCategory: 'ELIGIBLE_COUNTERPARTY',
        divisionClearance: {
          investmentBanking: true,
          wealthManagement: true,
          corporateTreasury: true,
        },
        gdprConsentMap: {
          FX: true,
          Rates: true,
          Credit: true,
          Equities: true,
          crossSell: true,
        },
        versionHistory: [
          {
            version: 'v2.4',
            timestamp: '2026-03-12T09:00:00Z',
            modifiedBy: 'Officer K. Meier (Compliance)',
            changes: 'Re-verified UBO structure and renewed GwG declaration.',
          },
          {
            version: 'v2.3',
            timestamp: '2025-09-01T14:20:00Z',
            modifiedBy: 'System Auto-Audit',
            changes: 'Annual MiFID II suitability taxonomy refresh.',
          },
        ],
      },
      {
        id: 'CL-DE-4412',
        name: 'Siemens Corporate Treasury GmbH',
        entityType: 'Corporate',
        kycStatus: 'VERIFIED',
        amlRiskLevel: 'LOW',
        suitabilityCategory: 'PROFESSIONAL',
        divisionClearance: {
          investmentBanking: true,
          wealthManagement: false,
          corporateTreasury: true,
        },
        gdprConsentMap: {
          FX: true,
          Rates: true,
          Credit: true,
          Equities: false,
          crossSell: false,
        },
        versionHistory: [
          {
            version: 'v1.8',
            timestamp: '2026-01-15T11:10:00Z',
            modifiedBy: 'S. Wagner (Sales)',
            changes: 'Opted in to Rates & FX derivative hedging disclosures.',
          },
        ],
      },
      {
        id: 'CL-LU-7719',
        name: 'BlackForest Alpha Hedge Fund LP',
        entityType: 'Institutional',
        kycStatus: 'VERIFIED',
        amlRiskLevel: 'MEDIUM',
        suitabilityCategory: 'ELIGIBLE_COUNTERPARTY',
        divisionClearance: {
          investmentBanking: true,
          wealthManagement: false,
          corporateTreasury: false,
        },
        gdprConsentMap: {
          FX: true,
          Rates: true,
          Credit: true,
          Equities: true,
          crossSell: true,
        },
        versionHistory: [
          {
            version: 'v3.1',
            timestamp: '2026-05-10T16:45:00Z',
            modifiedBy: 'M. Becker (1st Line)',
            changes: 'Updated prime brokerage leverage thresholds.',
          },
        ],
      },
      {
        id: 'CL-CH-1092',
        name: 'Helvetia Family Office Group',
        entityType: 'HNW',
        kycStatus: 'EXPIRED',
        amlRiskLevel: 'HIGH',
        suitabilityCategory: 'RETAIL',
        divisionClearance: {
          investmentBanking: false,
          wealthManagement: true,
          corporateTreasury: false,
        },
        gdprConsentMap: {
          FX: true,
          Rates: false,
          Credit: false,
          Equities: true,
          crossSell: false,
        },
        versionHistory: [
          {
            version: 'v1.0',
            timestamp: '2024-11-20T10:00:00Z',
            modifiedBy: 'Compliance Ops',
            changes: 'Initial onboarding. EXPIRED KYC document refresh required.',
          },
        ],
      },
      {
        id: 'CL-IT-3301',
        name: 'Banca Monte Subprime SPV',
        entityType: 'Institutional',
        kycStatus: 'PENDING',
        amlRiskLevel: 'CRITICAL',
        suitabilityCategory: 'PROFESSIONAL',
        divisionClearance: {
          investmentBanking: false,
          wealthManagement: false,
          corporateTreasury: false,
        },
        gdprConsentMap: {
          FX: false,
          Rates: false,
          Credit: false,
          Equities: false,
          crossSell: false,
        },
        versionHistory: [
          {
            version: 'v0.9',
            timestamp: '2026-07-01T08:30:00Z',
            modifiedBy: 'System Pre-Crime Audit',
            changes: 'Flagged by GwG AML engine — beneficial owner documentation missing.',
          },
        ],
      },
    ];
  }

  private seedOrders() {
    const orderDataSeeds = [
      {
        id: 'ORD-2026-001',
        traderId: 'TRD-8821',
        traderName: 'Alex Vance',
        clientId: 'CL-IT-3301', // High risk / pending client
        clientName: 'Banca Monte Subprime SPV',
        instrument: '5Y EUR Interest Rate Swap (IRS)',
        assetClass: 'Rates' as const,
        sizeEur: 50_000_000, // €50M Headline Demo Scenario 1!
        direction: 'BUY' as const,
        venue: 'Eurex MTF',
        status: 'Review Required' as const,
        isOffMarket: true,
        commsText: 'Submit quote off-market near 3pm rate fixing window',
      },
      {
        id: 'ORD-2026-002',
        traderId: 'TRD-8821',
        traderName: 'Alex Vance',
        clientId: 'CL-DE-9081',
        clientName: 'Allianz Global Investors SE',
        instrument: 'EUR/USD Forward 3M',
        assetClass: 'FX' as const,
        sizeEur: 25_000_000,
        direction: 'SELL' as const,
        venue: '360T MTF',
        status: 'Pending' as const,
        isOffMarket: false,
        commsText: 'Standard hedging order under benchmark execution policy.',
      },
      {
        id: 'ORD-2026-003',
        traderId: 'TRD-9904',
        traderName: 'Elena Rostova',
        clientId: 'CL-LU-7719',
        clientName: 'BlackForest Alpha Hedge Fund LP',
        instrument: 'iTraxx Europe Crossover 5Y CDS',
        assetClass: 'Credit' as const,
        sizeEur: 45_000_000, // Headline Demo Scenario 2: LIBOR / Mismarking similarity!
        direction: 'BUY' as const,
        venue: 'Tradeweb Off-Book',
        status: 'Review Required' as const,
        isOffMarket: true,
        commsText: 'Can we offset benchmark rate fix and discount spread by 15bps off-market?',
      },
      {
        id: 'ORD-2026-004',
        traderId: 'TRD-9904',
        traderName: 'Elena Rostova',
        clientId: 'CL-DE-4412',
        clientName: 'Siemens Corporate Treasury GmbH',
        instrument: '10Y Bund Futures Swap',
        assetClass: 'Rates' as const,
        sizeEur: 12_000_000,
        direction: 'BUY' as const,
        venue: 'Bloomberg MTF',
        status: 'Approved' as const,
        isOffMarket: false,
      },
      {
        id: 'ORD-2026-005',
        traderId: 'TRD-1022',
        traderName: 'Lukas Meyer',
        clientId: 'CL-CH-1092',
        clientName: 'Helvetia Family Office Group',
        instrument: 'Nestlé SA Equity Structured Note',
        assetClass: 'Equities' as const,
        sizeEur: 8_500_000,
        direction: 'BUY' as const,
        venue: 'Internal OTC',
        status: 'Blocked' as const, // Blocked due to expired KYC & Retail classification
        isOffMarket: false,
      },
    ];

    this.orders = orderDataSeeds.map((seed) => {
      const client = this.clients.find((c) => c.id === seed.clientId) || this.clients[0];
      const hasGdprConsent = client.gdprConsentMap[seed.assetClass] ?? false;

      const orderVector = buildOrderVector({
        sizeEur: seed.sizeEur,
        assetClass: seed.assetClass,
        kycStatus: client.kycStatus,
        amlRiskLevel: client.amlRiskLevel,
        commsText: seed.commsText,
        isOffMarket: seed.isOffMarket,
      });

      const precrimeMatch = matchPreCrimePattern(orderVector);

      const computed = computeGuardianScore({
        sizeEur: seed.sizeEur,
        assetClass: seed.assetClass,
        venue: seed.venue,
        kycStatus: client.kycStatus,
        amlRiskLevel: client.amlRiskLevel,
        suitabilityCategory: client.suitabilityCategory,
        gdprConsent: hasGdprConsent,
        precrimeSimilarityScore: precrimeMatch.similarityScore,
      });

      return {
        id: seed.id,
        traderId: seed.traderId,
        traderName: seed.traderName,
        clientId: seed.clientId,
        clientName: seed.clientName,
        instrument: seed.instrument,
        assetClass: seed.assetClass,
        sizeEur: seed.sizeEur,
        direction: seed.direction,
        venue: seed.venue,
        status: seed.status,
        guardianScore: computed.score,
        scoreBreakdown: computed.breakdown,
        mifidJustification: `Order ${seed.id} pre-scanned on ${seed.venue}. Executability Score: ${computed.breakdown.executabilityScore}/100. Best execution conditions verified.`,
        precrimeMatch,
        workflowStep: seed.status === 'Approved' ? 'APPROVED' : seed.status === 'Blocked' ? 'COMPLIANCE_REVIEW' : 'PRE_CRIME_CHECK',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  private seedBafin() {
    this.bafinAnnouncements = [
      {
        id: 'BAFIN-2026-08',
        title: 'BaFin Circular 04/2026: Algorithmic Rate Fixing & Benchmark Transparency',
        date: '2026-06-18',
        category: 'MiFID II / MAR',
        assetClasses: ['Rates', 'FX'],
        summary: 'Tightening pre-trade disclosure and comms monitoring for orders routed within 15 minutes of EURIBOR / ESTR fixing windows.',
        text: 'Financial institutions must ensure that all orders in benchmark-sensitive instruments routed near fixing windows undergo automated pre-trade anomaly analysis. Chat logs referencing quote adjustments or benchmark offsets must trigger an immediate 1st Line Compliance hold.',
        dos: [
          'Verify client suitability and consent prior to submitting benchmark order.',
          'Log explicit best-execution rationale comparing MTF depth vs internal crossing.',
          'Maintain timestamped audit records of automated pre-crime vector scans.',
        ],
        donts: [
          'Never execute off-market rate swaps within fixing window without Compliance sign-off.',
          'Do not combine unvetted client orders with proprietary hedging flows.',
          'Avoid routing orders if client KYC status is PENDING or EXPIRED.',
        ],
      },
      {
        id: 'BAFIN-2026-03',
        title: 'GwG Money Laundering Prevention: Ultimate Beneficial Owner (UBO) Strict Enforcement',
        date: '2026-04-10',
        category: 'GwG / AML',
        assetClasses: ['FX', 'Credit', 'Equities', 'Rates'],
        summary: 'Mandatory suspension of trading lines for counterparties lacking updated UBO registry validation.',
        text: 'Pursuant to Section 15 of the Money Laundering Act (GwG), credit institutions are strictly forbidden from executing transactions exceeding €100,000 for clients whose KYC due diligence package is expired or incomplete.',
        dos: [
          'Enforce instant system blocks on orders originating from EXPIRED KYC profiles.',
          'Re-verify offshore holding structures annually.',
        ],
        donts: [
          'Do not issue temporary manual compliance overrides without Central Compliance sign-off.',
        ],
      },
      {
        id: 'BAFIN-2025-11',
        title: 'MaRisk AT 4.3.2: Capital Buffers & Hedging Recommender Transparency',
        date: '2025-11-22',
        category: 'MaRisk',
        assetClasses: ['Credit', 'Rates'],
        summary: 'Requirements for AI and algorithmic hedging recommendations influencing regulatory capital.',
        text: 'When automated systems recommend credit risk hedges or macro interest rate overlays, the underlying efficiency score, capital impact, and rationale must be recorded in an immutable audit trail accessible to 2nd Line Risk Officers.',
        dos: [
          'Document combined hedging efficiency score and regulatory capital impact before booking.',
          'Ensure risk officers have one-click access to model XAI explanations.',
        ],
        donts: [
          'Do not execute unhedged illiquid credit positions exceeding €30M without Desk Head sign-off.',
        ],
      },
    ];
  }

  private seedIdeas() {
    this.ideas = [
      {
        id: 'IDEA-2026-101',
        title: 'Siemens Green Bond 10Y Asset Swap Arbitrage',
        assetClass: 'Rates',
        clientName: 'Allianz Global Investors SE',
        clientId: 'CL-DE-9081',
        expectedAlphaBps: 28,
        riskAdjustedReturn: 2.85,
        prescreenedPassed: true,
        justification: 'Pre-screened against Allianz suitability profile (Eligible Counterparty). GDPR consent verified for Rates derivatives. Zero BaFin MAR flags detected.',
        orderDraft: {
          instrument: 'Siemens 2.875% 2036 Asset Swap',
          direction: 'BUY',
          sizeEur: 15_000_000,
          venue: 'Eurex MTF',
        },
      },
      {
        id: 'IDEA-2026-102',
        title: 'EUR/USD 6M Collar Options Volatility Hedge',
        assetClass: 'FX',
        clientName: 'Siemens Corporate Treasury GmbH',
        clientId: 'CL-DE-4412',
        expectedAlphaBps: 42,
        riskAdjustedReturn: 3.10,
        prescreenedPassed: true,
        justification: 'Fully aligned with Siemens Corporate Treasury hedging mandate. Pre-cleared for FX derivatives with verified best-execution venue availability.',
        orderDraft: {
          instrument: 'EUR/USD 6M Zero-Cost Collar',
          direction: 'SELL',
          sizeEur: 20_000_000,
          venue: '360T MTF',
        },
      },
      {
        id: 'IDEA-2026-103',
        title: 'Sub-IG European Credit Index Steepener',
        assetClass: 'Credit',
        clientName: 'BlackForest Alpha Hedge Fund LP',
        clientId: 'CL-LU-7719',
        expectedAlphaBps: 65,
        riskAdjustedReturn: 1.95,
        prescreenedPassed: true,
        justification: 'Matches BlackForest Alpha high-yield mandate. Pre-crime similarity score low (0.12). Consent scope approved.',
        orderDraft: {
          instrument: 'iTraxx Europe Crossover 3Y/5Y Curve',
          direction: 'BUY',
          sizeEur: 30_000_000,
          venue: 'Tradeweb',
        },
      },
    ];
  }

  private seedAnomalies() {
    this.anomalies = [
      {
        id: 'ANOM-881',
        timestamp: new Date(Date.now() - 1200000).toISOString(),
        assetClass: 'Rates',
        metric: 'Italian BTP / German Bund 10Y Yield Spread',
        deviationSigma: 3.82,
        affectedClients: ['CL-IT-3301', 'CL-LU-7719'],
        alertLevel: 'RED',
        description: 'BTP/Bund 10Y spread widened sharply by +18bps in 15 mins (>3.8 sigma anomaly). 2 active clients hold pending suitability reviews in sovereign credit swaps.',
        recommendedAction: 'Freeze automated order execution on Italian sovereign swaps; request 1st Line Risk review.',
      },
      {
        id: 'ANOM-882',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        assetClass: 'FX',
        metric: 'EUR/USD 1M Implied Volatility Surface',
        deviationSigma: 2.45,
        affectedClients: ['CL-DE-4412'],
        alertLevel: 'AMBER',
        description: 'Implied vol skew shifted 2.45 sigma following ECB press conference commentary.',
        recommendedAction: 'Re-evaluate collar options pricing models and update client risk disclosures.',
      },
    ];
  }

  private seedHedges() {
    this.hedges = [
      {
        id: 'HDG-001',
        positionId: 'POS-RATES-50M',
        positionName: '€50M 5Y EUR Interest Rate Swap Pay-Fixed',
        assetClass: 'Rates',
        hedgeInstrument: '5Y German Bund Future (FGBM) Short Overlay',
        hedgeCostBps: 4.2,
        regCapitalImpactPct: -38.5, // 38.5% reduction in regulatory capital requirement!
        combinedEfficiencyScore: 92.4,
        recommendationRationale: 'Optimal duration & delta match; reduces RWA (Risk-Weighted Assets) capital charge by €1.85M with minimal execution slippage.',
      },
      {
        id: 'HDG-002',
        positionId: 'POS-CREDIT-45M',
        positionName: '€45M iTraxx Europe Crossover Long Credit Exposure',
        assetClass: 'Credit',
        hedgeInstrument: 'iTraxx Main 5Y Index Macro Protection',
        hedgeCostBps: 8.5,
        regCapitalImpactPct: -26.0,
        combinedEfficiencyScore: 84.1,
        recommendationRationale: 'Provides tail risk hedge against broad European credit spread widening while preserving +35bps net carry.',
      },
    ];
  }

  private seedExecutiveMetrics() {
    this.executiveMetrics = {
      hoursSavedTotal: 1420,
      approvalTimeReductionPct: 78.4,
      finesAvoidedEur: 12_500_000,
      roiPercentage: 340,
      monthlyTrends: [
        { month: 'Jan', hoursSaved: 180, riskScoreAvg: 88, orderVolume: 420 },
        { month: 'Feb', hoursSaved: 210, riskScoreAvg: 89, orderVolume: 480 },
        { month: 'Mar', hoursSaved: 240, riskScoreAvg: 91, orderVolume: 530 },
        { month: 'Apr', hoursSaved: 250, riskScoreAvg: 92, orderVolume: 510 },
        { month: 'May', hoursSaved: 260, riskScoreAvg: 94, orderVolume: 610 },
        { month: 'Jun', hoursSaved: 280, riskScoreAvg: 95, orderVolume: 670 },
      ],
    };
  }
}

export const globalStore = new DataStore();
