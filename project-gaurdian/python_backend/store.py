import time
import uuid
from datetime import datetime

# Python Data Store for Project Guardian

PERSONA_CONFIG = {
    'Trader': {
        'name': 'Alex Vance',
        'defaultRoute': '/trade',
        'allowedRoutes': ['/home', '/trade', '/clients', '/ideas', '/audit'],
        'description': 'Front-office execution & algorithmic order blotter',
    },
    'Salesperson': {
        'name': 'Sarah Wagner',
        'defaultRoute': '/clients',
        'allowedRoutes': ['/home', '/clients', '/ideas', '/trade', '/audit'],
        'description': 'Client coverage, suitability passports & trade ideas',
    },
    'Desk Head': {
        'name': 'Marcus Sterling',
        'defaultRoute': '/home',
        'allowedRoutes': ['/home', '/trade', '/clients', '/ideas', '/bafin', '/risk', '/audit'],
        'description': 'Desk oversight, sign-offs & aggregated blotter',
    },
    'Compliance (1st Line)': {
        'name': 'Klaus Meier',
        'defaultRoute': '/audit',
        'allowedRoutes': ['/home', '/trade', '/clients', '/bafin', '/risk', '/audit'],
        'description': 'Pre-Crime interrupts, trade exceptions & 1st line review',
    },
    'Central Compliance': {
        'name': 'Dr. Hannah Weber',
        'defaultRoute': '/bafin',
        'allowedRoutes': ['/home', '/bafin', '/audit', '/clients', '/risk'],
        'description': 'BaFin rulebook interpretation, RAG & regulatory policy',
    },
    'Risk Officer': {
        'name': 'David Chen',
        'defaultRoute': '/risk',
        'allowedRoutes': ['/home', '/risk', '/trade', '/audit'],
        'description': 'Cross-market anomaly detection & capital hedging',
    },
    'IT/Ops': {
        'name': 'Michael Schmidt',
        'defaultRoute': '/clients',
        'allowedRoutes': ['/home', '/clients', '/audit', '/trade'],
        'description': 'Reconciliation, data integrity & system health',
    },
    'Auditor': {
        'name': 'Evelyn Reed (External)',
        'defaultRoute': '/audit',
        'allowedRoutes': ['/home', '/audit', '/bafin', '/clients', '/trade', '/risk', '/executive'],
        'description': 'Full immutable XAI audit trail inspection & PDF export',
    },
    'Wealth/Relationship Manager': {
        'name': 'Julia Hoffmann',
        'defaultRoute': '/clients',
        'allowedRoutes': ['/home', '/clients', '/ideas', '/audit'],
        'description': 'HNW Client passports, GDPR consent & wealth ideas',
    },
    'Executive': {
        'name': 'Christian Lindner (Board)',
        'defaultRoute': '/executive',
        'allowedRoutes': ['/home', '/executive', '/trade', '/clients', '/ideas', '/bafin', '/risk', '/audit'],
        'description': 'Executive ROI KPIs, hours saved & regulatory impact',
    },
}

class DataStore:
    def __init__(self):
        self.active_persona = 'Trader'
        self.active_user = 'Alex Vance (Trader)'
        self.clients = []
        self.orders = []
        self.bafin_announcements = []
        self.ideas = []
        self.anomalies = []
        self.hedges = []
        self.executive_metrics = {}
        self.audit_logs = []

        self.seed_clients()
        self.seed_bafin()
        self.seed_ideas()
        self.seed_anomalies()
        self.seed_hedges()
        self.seed_executive_metrics()
        self.seed_orders()

    def seed_clients(self):
        self.clients = [
            {
                'id': 'CL-DE-9081',
                'name': 'Allianz Global Investors SE',
                'entityType': 'Institutional',
                'kycStatus': 'VERIFIED',
                'amlRiskLevel': 'LOW',
                'suitabilityCategory': 'ELIGIBLE_COUNTERPARTY',
                'divisionClearance': {
                    'investmentBanking': True,
                    'wealthManagement': True,
                    'corporateTreasury': True,
                },
                'gdprConsentMap': {
                    'FX': True,
                    'Rates': True,
                    'Credit': True,
                    'Equities': True,
                    'crossSell': True,
                },
                'versionHistory': [
                    {
                        'version': 'v2.4',
                        'timestamp': '2026-03-12T09:00:00Z',
                        'modifiedBy': 'Officer K. Meier (Compliance)',
                        'changes': 'Re-verified UBO structure and renewed GwG declaration.',
                    },
                    {
                        'version': 'v2.3',
                        'timestamp': '2025-09-01T14:20:00Z',
                        'modifiedBy': 'System Auto-Audit',
                        'changes': 'Annual MiFID II suitability taxonomy refresh.',
                    },
                ],
            },
            {
                'id': 'CL-DE-4412',
                'name': 'Siemens Corporate Treasury GmbH',
                'entityType': 'Corporate',
                'kycStatus': 'VERIFIED',
                'amlRiskLevel': 'LOW',
                'suitabilityCategory': 'PROFESSIONAL',
                'divisionClearance': {
                    'investmentBanking': True,
                    'wealthManagement': False,
                    'corporateTreasury': True,
                },
                'gdprConsentMap': {
                    'FX': True,
                    'Rates': True,
                    'Credit': True,
                    'Equities': False,
                    'crossSell': False,
                },
                'versionHistory': [
                    {
                        'version': 'v1.8',
                        'timestamp': '2026-01-15T11:10:00Z',
                        'modifiedBy': 'S. Wagner (Sales)',
                        'changes': 'Opted in to Rates & FX derivative hedging disclosures.',
                    },
                ],
            },
            {
                'id': 'CL-LU-7719',
                'name': 'BlackForest Alpha Hedge Fund LP',
                'entityType': 'Institutional',
                'kycStatus': 'VERIFIED',
                'amlRiskLevel': 'MEDIUM',
                'suitabilityCategory': 'ELIGIBLE_COUNTERPARTY',
                'divisionClearance': {
                    'investmentBanking': True,
                    'wealthManagement': False,
                    'corporateTreasury': False,
                },
                'gdprConsentMap': {
                    'FX': True,
                    'Rates': True,
                    'Credit': True,
                    'Equities': True,
                    'crossSell': True,
                },
                'versionHistory': [
                    {
                        'version': 'v3.1',
                        'timestamp': '2026-05-10T16:45:00Z',
                        'modifiedBy': 'M. Becker (1st Line)',
                        'changes': 'Updated prime brokerage leverage thresholds.',
                    },
                ],
            },
            {
                'id': 'CL-CH-1092',
                'name': 'Helvetia Family Office Group',
                'entityType': 'HNW',
                'kycStatus': 'EXPIRED',
                'amlRiskLevel': 'HIGH',
                'suitabilityCategory': 'RETAIL',
                'divisionClearance': {
                    'investmentBanking': False,
                    'wealthManagement': True,
                    'corporateTreasury': False,
                },
                'gdprConsentMap': {
                    'FX': True,
                    'Rates': False,
                    'Credit': False,
                    'Equities': True,
                    'crossSell': False,
                },
                'versionHistory': [
                    {
                        'version': 'v1.0',
                        'timestamp': '2024-11-20T10:00:00Z',
                        'modifiedBy': 'Compliance Ops',
                        'changes': 'Initial onboarding. EXPIRED KYC document refresh required.',
                    },
                ],
            },
            {
                'id': 'CL-IT-3301',
                'name': 'Banca Monte Subprime SPV',
                'entityType': 'Institutional',
                'kycStatus': 'PENDING',
                'amlRiskLevel': 'CRITICAL',
                'suitabilityCategory': 'PROFESSIONAL',
                'divisionClearance': {
                    'investmentBanking': False,
                    'wealthManagement': False,
                    'corporateTreasury': False,
                },
                'gdprConsentMap': {
                    'FX': False,
                    'Rates': False,
                    'Credit': False,
                    'Equities': False,
                    'crossSell': False,
                },
                'versionHistory': [
                    {
                        'version': 'v0.9',
                        'timestamp': '2026-07-01T08:30:00Z',
                        'modifiedBy': 'System Pre-Crime Audit',
                        'changes': 'Flagged by GwG AML engine — beneficial owner documentation missing.',
                    },
                ],
            },
        ]

    def seed_bafin(self):
        self.bafin_announcements = [
            {
                'id': 'BAFIN-2026-08',
                'title': 'BaFin Circular 04/2026: Algorithmic Rate Fixing & Benchmark Transparency',
                'date': '2026-06-18',
                'category': 'MiFID II / MAR',
                'assetClasses': ['Rates', 'FX'],
                'summary': 'Tightening pre-trade disclosure and comms monitoring for orders routed within 15 minutes of EURIBOR / ESTR fixing windows.',
                'text': 'Financial institutions must ensure that all orders in benchmark-sensitive instruments routed near fixing windows undergo automated pre-trade anomaly analysis. Chat logs referencing quote adjustments or benchmark offsets must trigger an immediate 1st Line Compliance hold.',
                'dos': [
                    'Verify client suitability and consent prior to submitting benchmark order.',
                    'Log explicit best-execution rationale comparing MTF depth vs internal crossing.',
                    'Maintain timestamped audit records of automated pre-crime vector scans.',
                ],
                'donts': [
                    'Never execute off-market rate swaps within fixing window without Compliance sign-off.',
                    'Do not combine unvetted client orders with proprietary hedging flows.',
                    'Avoid routing orders if client KYC status is PENDING or EXPIRED.',
                ],
            },
            {
                'id': 'BAFIN-2026-03',
                'title': 'GwG Money Laundering Prevention: Ultimate Beneficial Owner (UBO) Strict Enforcement',
                'date': '2026-04-10',
                'category': 'GwG / AML',
                'assetClasses': ['FX', 'Credit', 'Equities', 'Rates'],
                'summary': 'Mandatory suspension of trading lines for counterparties lacking updated UBO registry validation.',
                'text': 'Pursuant to Section 15 of the Money Laundering Act (GwG), credit institutions are strictly forbidden from executing transactions exceeding €100,000 for clients whose KYC due diligence package is expired or incomplete.',
                'dos': [
                    'Enforce instant system blocks on orders originating from EXPIRED KYC profiles.',
                    'Re-verify offshore holding structures annually.',
                ],
                'donts': [
                    'Do not issue temporary manual compliance overrides without Central Compliance sign-off.',
                ],
            },
            {
                'id': 'BAFIN-2025-11',
                'title': 'MaRisk AT 4.3.2: Capital Buffers & Hedging Recommender Transparency',
                'date': '2025-11-22',
                'category': 'MaRisk',
                'assetClasses': ['Credit', 'Rates'],
                'summary': 'Requirements for AI and algorithmic hedging recommendations influencing regulatory capital.',
                'text': 'When automated systems recommend credit risk hedges or macro interest rate overlays, the underlying efficiency score, capital impact, and rationale must be recorded in an immutable audit trail accessible to 2nd Line Risk Officers.',
                'dos': [
                    'Document combined hedging efficiency score and regulatory capital impact before booking.',
                    'Ensure risk officers have one-click access to model XAI explanations.',
                ],
                'donts': [
                    'Do not execute unhedged illiquid credit positions exceeding €30M without Desk Head sign-off.',
                ],
            },
        ]

    def seed_ideas(self):
        self.ideas = [
            {
                'id': 'IDEA-2026-101',
                'title': 'Siemens Green Bond 10Y Asset Swap Arbitrage',
                'assetClass': 'Rates',
                'clientName': 'Allianz Global Investors SE',
                'clientId': 'CL-DE-9081',
                'expectedAlphaBps': 28,
                'riskAdjustedReturn': 2.85,
                'prescreenedPassed': True,
                'justification': 'Pre-screened against Allianz suitability profile (Eligible Counterparty). GDPR consent verified for Rates derivatives. Zero BaFin MAR flags detected.',
                'orderDraft': {
                    'instrument': 'Siemens 2.875% 2036 Asset Swap',
                    'direction': 'BUY',
                    'sizeEur': 15000000,
                    'venue': 'Eurex MTF',
                },
            },
            {
                'id': 'IDEA-2026-102',
                'title': 'EUR/USD 6M Collar Options Volatility Hedge',
                'assetClass': 'FX',
                'clientName': 'Siemens Corporate Treasury GmbH',
                'clientId': 'CL-DE-4412',
                'expectedAlphaBps': 42,
                'riskAdjustedReturn': 3.10,
                'prescreenedPassed': True,
                'justification': 'Fully aligned with Siemens Corporate Treasury hedging mandate. Pre-cleared for FX derivatives with verified best-execution venue availability.',
                'orderDraft': {
                    'instrument': 'EUR/USD 6M Zero-Cost Collar',
                    'direction': 'SELL',
                    'sizeEur': 20000000,
                    'venue': '360T MTF',
                },
            },
            {
                'id': 'IDEA-2026-103',
                'title': 'Sub-IG European Credit Index Steepener',
                'assetClass': 'Credit',
                'clientName': 'BlackForest Alpha Hedge Fund LP',
                'clientId': 'CL-LU-7719',
                'expectedAlphaBps': 65,
                'riskAdjustedReturn': 1.95,
                'prescreenedPassed': True,
                'justification': 'Matches BlackForest Alpha high-yield mandate. Pre-crime similarity score low (0.12). Consent scope approved.',
                'orderDraft': {
                    'instrument': 'iTraxx Europe Crossover 3Y/5Y Curve',
                    'direction': 'BUY',
                    'sizeEur': 30000000,
                    'venue': 'Tradeweb',
                },
            },
        ]

    def seed_anomalies(self):
        self.anomalies = [
            {
                'id': 'ANOM-881',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'assetClass': 'Rates',
                'metric': 'Italian BTP / German Bund 10Y Yield Spread',
                'deviationSigma': 3.82,
                'affectedClients': ['CL-IT-3301', 'CL-LU-7719'],
                'alertLevel': 'RED',
                'description': 'BTP/Bund 10Y spread widened sharply by +18bps in 15 mins (>3.8 sigma anomaly). 2 active clients hold pending suitability reviews in sovereign credit swaps.',
                'recommendedAction': 'Freeze automated order execution on Italian sovereign swaps; request 1st Line Risk review.',
            },
            {
                'id': 'ANOM-882',
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'assetClass': 'FX',
                'metric': 'EUR/USD 1M Implied Volatility Surface',
                'deviationSigma': 2.45,
                'affectedClients': ['CL-DE-4412'],
                'alertLevel': 'AMBER',
                'description': 'Implied vol skew shifted 2.45 sigma following ECB press conference commentary.',
                'recommendedAction': 'Re-evaluate collar options pricing models and update client risk disclosures.',
            },
        ]

    def seed_hedges(self):
        self.hedges = [
            {
                'id': 'HDG-001',
                'positionId': 'POS-RATES-50M',
                'positionName': '€50M 5Y EUR Interest Rate Swap Pay-Fixed',
                'assetClass': 'Rates',
                'hedgeInstrument': '5Y German Bund Future (FGBM) Short Overlay',
                'hedgeCostBps': 4.2,
                'regCapitalImpactPct': -38.5,
                'combinedEfficiencyScore': 92.4,
                'recommendationRationale': 'Optimal duration & delta match; reduces RWA (Risk-Weighted Assets) capital charge by €1.85M with minimal execution slippage.',
            },
            {
                'id': 'HDG-002',
                'positionId': 'POS-CREDIT-45M',
                'positionName': '€45M iTraxx Europe Crossover Long Credit Exposure',
                'assetClass': 'Credit',
                'hedgeInstrument': 'iTraxx Main 5Y Index Macro Protection',
                'hedgeCostBps': 8.5,
                'regCapitalImpactPct': -26.0,
                'combinedEfficiencyScore': 84.1,
                'recommendationRationale': 'Provides tail risk hedge against broad European credit spread widening while preserving +35bps net carry.',
            },
        ]

    def seed_executive_metrics(self):
        self.executive_metrics = {
            'hoursSavedTotal': 1420,
            'approvalTimeReductionPct': 78.4,
            'finesAvoidedEur': 12500000,
            'roiPercentage': 340,
            'monthlyTrends': [
                {'month': 'Jan', 'hoursSaved': 180, 'riskScoreAvg': 88, 'orderVolume': 420},
                {'month': 'Feb', 'hoursSaved': 210, 'riskScoreAvg': 89, 'orderVolume': 480},
                {'month': 'Mar', 'hoursSaved': 240, 'riskScoreAvg': 91, 'orderVolume': 530},
                {'month': 'Apr', 'hoursSaved': 250, 'riskScoreAvg': 92, 'orderVolume': 510},
                {'month': 'May', 'hoursSaved': 260, 'riskScoreAvg': 94, 'orderVolume': 610},
                {'month': 'Jun', 'hoursSaved': 280, 'riskScoreAvg': 95, 'orderVolume': 670},
            ],
        }

    def seed_orders(self):
        from scoring import compute_guardian_score
        from vector_engine import build_order_vector, match_precrime_pattern

        order_seeds = [
            {
                'id': 'ORD-2026-001',
                'traderId': 'TRD-8821',
                'traderName': 'Alex Vance',
                'clientId': 'CL-IT-3301',
                'clientName': 'Banca Monte Subprime SPV',
                'instrument': '5Y EUR Interest Rate Swap (IRS)',
                'assetClass': 'Rates',
                'sizeEur': 50000000,
                'direction': 'BUY',
                'venue': 'Eurex MTF',
                'status': 'Review Required',
                'isOffMarket': True,
                'commsText': 'Submit quote off-market near 3pm rate fixing window',
            },
            {
                'id': 'ORD-2026-002',
                'traderId': 'TRD-8821',
                'traderName': 'Alex Vance',
                'clientId': 'CL-DE-9081',
                'clientName': 'Allianz Global Investors SE',
                'instrument': 'EUR/USD Forward 3M',
                'assetClass': 'FX',
                'sizeEur': 25000000,
                'direction': 'SELL',
                'venue': '360T MTF',
                'status': 'Pending',
                'isOffMarket': False,
                'commsText': 'Standard hedging order under benchmark execution policy.',
            },
            {
                'id': 'ORD-2026-003',
                'traderId': 'TRD-9904',
                'traderName': 'Elena Rostova',
                'clientId': 'CL-LU-7719',
                'clientName': 'BlackForest Alpha Hedge Fund LP',
                'instrument': 'iTraxx Europe Crossover 5Y CDS',
                'assetClass': 'Credit',
                'sizeEur': 45000000,
                'direction': 'BUY',
                'venue': 'Tradeweb Off-Book',
                'status': 'Review Required',
                'isOffMarket': True,
                'commsText': 'Can we offset benchmark rate fix and discount spread by 15bps off-market?',
            },
            {
                'id': 'ORD-2026-004',
                'traderId': 'TRD-9904',
                'traderName': 'Elena Rostova',
                'clientId': 'CL-DE-4412',
                'clientName': 'Siemens Corporate Treasury GmbH',
                'instrument': '10Y Bund Futures Swap',
                'assetClass': 'Rates',
                'sizeEur': 12000000,
                'direction': 'BUY',
                'venue': 'Bloomberg MTF',
                'status': 'Approved',
                'isOffMarket': False,
            },
            {
                'id': 'ORD-2026-005',
                'traderId': 'TRD-1022',
                'traderName': 'Lukas Meyer',
                'clientId': 'CL-CH-1092',
                'clientName': 'Helvetia Family Office Group',
                'instrument': 'Nestlé SA Equity Structured Note',
                'assetClass': 'Equities',
                'sizeEur': 8500000,
                'direction': 'BUY',
                'venue': 'Internal OTC',
                'status': 'Blocked',
                'isOffMarket': False,
            },
        ]

        self.orders = []
        for seed in order_seeds:
            client = next((c for c in self.clients if c['id'] == seed['clientId']), self.clients[0])
            gdpr_consent = client['gdprConsentMap'].get(seed['assetClass'], False)

            order_vec = build_order_vector(
                size_eur=seed['sizeEur'],
                asset_class=seed['assetClass'],
                kyc_status=client['kycStatus'],
                aml_risk_level=client['amlRiskLevel'],
                comms_text=seed.get('commsText', ''),
                is_off_market=seed.get('isOffMarket', False)
            )

            precrime_match = match_precrime_pattern(order_vec)

            computed = compute_guardian_score(
                size_eur=seed['sizeEur'],
                asset_class=seed['assetClass'],
                venue=seed['venue'],
                kyc_status=client['kycStatus'],
                aml_risk_level=client['amlRiskLevel'],
                suitability_category=client['suitabilityCategory'],
                gdpr_consent=gdpr_consent,
                precrime_similarity_score=precrime_match['similarityScore']
            )

            workflow_step = 'APPROVED' if seed['status'] == 'Approved' else ('COMPLIANCE_REVIEW' if seed['status'] == 'Blocked' else 'PRE_CRIME_CHECK')

            self.orders.append({
                'id': seed['id'],
                'traderId': seed['traderId'],
                'traderName': seed['traderName'],
                'clientId': seed['clientId'],
                'clientName': seed['clientName'],
                'instrument': seed['instrument'],
                'assetClass': seed['assetClass'],
                'sizeEur': seed['sizeEur'],
                'direction': seed['direction'],
                'venue': seed['venue'],
                'status': seed['status'],
                'guardianScore': computed['score'],
                'scoreBreakdown': computed['breakdown'],
                'mifidJustification': f"Order {seed['id']} pre-scanned on {seed['venue']}. Executability Score: {computed['breakdown']['executabilityScore']}/100. Best execution conditions verified.",
                'precrimeMatch': precrime_match,
                'workflowStep': workflow_step,
                'createdAt': datetime.utcnow().isoformat() + 'Z',
                'updatedAt': datetime.utcnow().isoformat() + 'Z',
            })

store = DataStore()
