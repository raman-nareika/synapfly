import { describe, expect, it } from 'vitest';
import { calculateImpactDamage, calculatePanicTargetHp, CONST } from './engine';

describe('panic HP formula', () => {
  it('keeps a healthy fly above minimum weak-hit damage when possible', () => {
    const hp = calculatePanicTargetHp(60, 10, 0.5);
    expect(hp).toBeGreaterThan(10);
    expect(hp).toBeLessThan(60);
  });

  it('does not promote a critically injured fly into the safe range', () => {
    const hp = calculatePanicTargetHp(7, 10, 0.5);
    expect(hp).toBeGreaterThanOrEqual(1);
    expect(hp).toBeLessThan(10);
    expect(hp).toBeLessThan(7);
  });

  it('handles the 11 HP edge case with a real penalty', () => {
    expect(calculatePanicTargetHp(11, 10, 0.5)).toBe(10);
  });

  it('never kills a 1 HP fly in penalty mode', () => {
    expect(calculatePanicTargetHp(1, 10, 0.5)).toBe(1);
  });

  it('has a larger absolute penalty at higher starting HP for the same random roll', () => {
    const low = 30 - calculatePanicTargetHp(30, 10, 0.5);
    const high = 90 - calculatePanicTargetHp(90, 10, 0.5);
    expect(high).toBeGreaterThan(low);
  });
});

describe('impact damage', () => {
  it('starts at the configured minimum and grows with speed', () => {
    expect(calculateImpactDamage(60)).toBe(CONST.MIN_HIT_DAMAGE);
    expect(calculateImpactDamage(260)).toBeGreaterThan(calculateImpactDamage(140));
  });
});
