import { describe, expect, it } from 'vitest';
import { parseAmountToCents } from './money';

describe('montants écrits par les banques → centimes entiers', () => {
  it.each([
    ['12,30', 1230],
    ['-12,30', -1230],
    ['1 234,56', 123456],
    ['1 234,56', 123456],
    ['1 234,56 €', 123456],
    ['-1.234,56', -123456],
    ['1,234.56', 123456],
    ['+8.5', 850],
    ['0,07', 7],
    ['(45,00)', -4500],
    ['45,00-', -4500],
    ['1.250', 125000],
    ['1.234.567', 123456700],
    ['−3,10', -310],
    ['EUR 9.99', 999],
    ['12', 1200],
  ])('« %s » → %i', (raw, cents) => {
    expect(parseAmountToCents(raw)).toBe(cents);
  });

  it.each(['', 'abc', '12,3456', '--', '1,2,3x'])('« %s » est refusé', (raw) => {
    expect(parseAmountToCents(raw)).toBeNull();
  });

  it('aucune perte de centime sur les montants piégeux pour les nombres à virgule', () => {
    expect(parseAmountToCents('0,1')).toBe(10);
    expect(parseAmountToCents('1 000 000,29')).toBe(100000029);
  });
});
