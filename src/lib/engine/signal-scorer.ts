import { RawSignal, ScoredSignal } from '@/types/domain';
import { SignalStrength } from '@/types/database';
import { clamp } from '@/lib/utils/math';
import { SCORING } from '@/lib/config';

export function scoreSignal(raw: RawSignal): ScoredSignal {
  const magnitude = clamp(raw.magnitude, 0, 100);
  const velocity = clamp(raw.velocity, 0, 100);
  const novelty = clamp(raw.novelty, 0, 100);
  const confidence = clamp(raw.confidence, 0, 100);

  const compositeScore = (
    magnitude * SCORING.weights.magnitude +
    velocity * SCORING.weights.velocity +
    novelty * SCORING.weights.novelty +
    confidence * SCORING.weights.confidence
  );

  const strength = getStrength(compositeScore);

  return {
    ...raw,
    magnitude,
    velocity,
    novelty,
    confidence,
    compositeScore,
    zScore: null, // Set later by trend detector
    strength,
  };
}

export function scoreSignals(signals: RawSignal[]): ScoredSignal[] {
  return signals.map(scoreSignal).sort((a, b) => b.compositeScore - a.compositeScore);
}

function getStrength(score: number): SignalStrength {
  if (score >= SCORING.strengthThresholds.extreme) return 'extreme';
  if (score >= SCORING.strengthThresholds.strong) return 'strong';
  if (score >= SCORING.strengthThresholds.medium) return 'medium';
  return 'weak';
}
