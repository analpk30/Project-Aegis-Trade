import { GuardianScoreBreakdown } from '../types';

/**
 * Deterministic pure mathematical scoring engine for Project Guardian.
 * Computes the Guardian Score (0 - 100) and component breakdown.
 * Higher score = higher safety / compliance approval confidence.
 */
export function computeGuardianScore(params: {
  sizeEur: number;
  assetClass: string;
  venue: string;
  kycStatus: 'VERIFIED' | 'EXPIRED' | 'PENDING';
  amlRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suitabilityCategory: 'RETAIL' | 'PROFESSIONAL' | 'ELIGIBLE_COUNTERPARTY';
  gdprConsent: boolean;
  precrimeSimilarityScore?: number; // 0 - 1 (higher = more similar to fine case)
}): { score: number; breakdown: GuardianScoreBreakdown; trafficLight: 'GREEN' | 'AMBER' | 'RED' } {
  // 1. Executability Score (0-100): based on venue width & transaction size
  let executabilityScore = 95;
  if (params.sizeEur > 50_000_000) executabilityScore -= 25;
  else if (params.sizeEur > 20_000_000) executabilityScore -= 15;
  else if (params.sizeEur > 5_000_000) executabilityScore -= 5;

  if (params.venue.toLowerCase().includes('internal')) executabilityScore += 5;
  executabilityScore = Math.max(10, Math.min(100, executabilityScore));

  // 2. Violation Risk Score (0-100, where 100 = safe/low risk, 0 = high risk of violation)
  let violationRiskScore = 90;
  if (params.amlRiskLevel === 'CRITICAL') violationRiskScore -= 60;
  else if (params.amlRiskLevel === 'HIGH') violationRiskScore -= 35;
  else if (params.amlRiskLevel === 'MEDIUM') violationRiskScore -= 15;

  if (params.kycStatus === 'EXPIRED') violationRiskScore -= 30;
  if (params.kycStatus === 'PENDING') violationRiskScore -= 15;

  if (params.precrimeSimilarityScore !== undefined) {
    // If precrime similarity is high (e.g. > 0.70), penalize violationRisk heavily
    if (params.precrimeSimilarityScore > 0.85) {
      violationRiskScore -= 60;
    } else if (params.precrimeSimilarityScore > 0.70) {
      violationRiskScore -= 40;
    } else if (params.precrimeSimilarityScore > 0.50) {
      violationRiskScore -= 20;
    }
  }
  violationRiskScore = Math.max(5, Math.min(100, violationRiskScore));

  // 3. Consent Score (0-100)
  let consentScore = params.gdprConsent ? 100 : 20;
  if (params.suitabilityCategory === 'RETAIL') consentScore -= 15; // Retail needs extra checks

  // 4. Regulatory Capital Impact Score (0-100, 100 = minimal impact)
  let regCapitalImpact = 85;
  if (params.assetClass === 'Credit' && params.sizeEur > 30_000_000) regCapitalImpact -= 30;
  if (params.assetClass === 'Rates' && params.sizeEur > 50_000_000) regCapitalImpact -= 20;

  // Weighted overall Guardian Score:
  // Executability: 25%, Violation Risk: 40%, Consent: 20%, Capital Impact: 15%
  const overall = Math.round(
    executabilityScore * 0.25 +
    violationRiskScore * 0.40 +
    consentScore * 0.20 +
    regCapitalImpact * 0.15
  );

  let trafficLight: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
  if (overall < 55 || violationRiskScore < 40) {
    trafficLight = 'RED';
  } else if (overall < 78 || violationRiskScore < 70) {
    trafficLight = 'AMBER';
  }

  return {
    score: overall,
    breakdown: {
      executabilityScore,
      violationRiskScore,
      consentScore,
      regulatoryCapitalImpact: regCapitalImpact,
    },
    trafficLight,
  };
}
