import time
import uuid
import ast
from datetime import datetime
import csv
import json

import pandas as pd
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

    def _load_csv_records(self, path, literal_fields=None):
        with open(path, mode="r", encoding="utf-8-sig", newline="") as f:
            records = list(csv.DictReader(f))

        for record in records:
            for field in literal_fields or []:
                value = record.get(field)
                if isinstance(value, str) and value:
                    try:
                        record[field] = ast.literal_eval(value)
                    except (ValueError, SyntaxError):
                        pass

        return records

    def _decode_nested_value(self, value):
        if isinstance(value, str):
            text = value.strip()
            if not text:
                return value

            for decoder in (json.loads, ast.literal_eval):
                try:
                    decoded = decoder(text)
                except (ValueError, SyntaxError, json.JSONDecodeError):
                    continue

                return self._decode_nested_value(decoded)

        if isinstance(value, list):
            return [self._decode_nested_value(item) for item in value]

        if isinstance(value, dict):
            return {key: self._decode_nested_value(item) for key, item in value.items()}

        return value

    def _load_file(self, path):
        frame = pd.read_json(path, convert_dates=False)
        records = frame.to_dict(orient="records")
        return records

    
# [self._decode_nested_value(record) for record in records]
    def seed_clients(self):
        self.clients = self._load_file(
            '../data/clients_data.json'
        )
        print(f"Seeded fine cases : {self.clients}")
        

    def seed_bafin(self):
        self.bafin_announcements = self._load_file(
            '../data/BaFin_Announcements_100.json'
        )
        print(f"Seeded bafin cases : {self.bafin_announcements}")

    def seed_ideas(self):
        self.ideas = self._load_file('../data/ideas_data_100.json',
      
        )
        print(f"Seeded fine cases : {self.ideas}")

    def seed_anomalies(self):
        self.anomalies = self._load_file(
            '../data/anomalies.json',
        )
        print(f"Seeded fine cases : {self.anomalies}")

    def seed_hedges(self):
        self.hedges = self._load_file(
                    '../data/hedges.json',
                )

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
        order_seeds = self._load_file(
                    '../data/trade_orders_100.json',
                )

        # order_seeds = [
        #     {
        #         'id': 'ORD-2026-001',
        #         'traderId': 'TRD-8821',
        #         'traderName': 'Alex Vance',
        #         'clientId': 'CL-IT-3301',
        #         'clientName': 'Banca Monte Subprime SPV',
        #         'instrument': '5Y EUR Interest Rate Swap (IRS)',
        #         'assetClass': 'Rates',
        #         'sizeEur': 50000000,
        #         'direction': 'BUY',
        #         'venue': 'Eurex MTF',
        #         'status': 'Review Required',
        #         'isOffMarket': True,
        #         'commsText': 'Submit quote off-market near 3pm rate fixing window',
        #     },
        #     {
        #         'id': 'ORD-2026-002',
        #         'traderId': 'TRD-8821',
        #         'traderName': 'Alex Vance',
        #         'clientId': 'CL-DE-9081',
        #         'clientName': 'Allianz Global Investors SE',
        #         'instrument': 'EUR/USD Forward 3M',
        #         'assetClass': 'FX',
        #         'sizeEur': 25000000,
        #         'direction': 'SELL',
        #         'venue': '360T MTF',
        #         'status': 'Pending',
        #         'isOffMarket': False,
        #         'commsText': 'Standard hedging order under benchmark execution policy.',
        #     },
        #     {
        #         'id': 'ORD-2026-003',
        #         'traderId': 'TRD-9904',
        #         'traderName': 'Elena Rostova',
        #         'clientId': 'CL-LU-7719',
        #         'clientName': 'BlackForest Alpha Hedge Fund LP',
        #         'instrument': 'iTraxx Europe Crossover 5Y CDS',
        #         'assetClass': 'Credit',
        #         'sizeEur': 45000000,
        #         'direction': 'BUY',
        #         'venue': 'Tradeweb Off-Book',
        #         'status': 'Review Required',
        #         'isOffMarket': True,
        #         'commsText': 'Can we offset benchmark rate fix and discount spread by 15bps off-market?',
        #     },
        #     {
        #         'id': 'ORD-2026-004',
        #         'traderId': 'TRD-9904',
        #         'traderName': 'Elena Rostova',
        #         'clientId': 'CL-DE-4412',
        #         'clientName': 'Siemens Corporate Treasury GmbH',
        #         'instrument': '10Y Bund Futures Swap',
        #         'assetClass': 'Rates',
        #         'sizeEur': 12000000,
        #         'direction': 'BUY',
        #         'venue': 'Bloomberg MTF',
        #         'status': 'Approved',
        #         'isOffMarket': False,
        #     },
        #     {
        #         'id': 'ORD-2026-005',
        #         'traderId': 'TRD-1022',
        #         'traderName': 'Lukas Meyer',
        #         'clientId': 'CL-CH-1092',
        #         'clientName': 'Helvetia Family Office Group',
        #         'instrument': 'Nestlé SA Equity Structured Note',
        #         'assetClass': 'Equities',
        #         'sizeEur': 8500000,
        #         'direction': 'BUY',
        #         'venue': 'Internal OTC',
        #         'status': 'Blocked',
        #         'isOffMarket': False,
        #     },
        # ]

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
