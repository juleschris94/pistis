import { describe, expect, it } from 'vitest';
import { checkImage, fitWithin, MEDIA_LIMITS, sniffImageMime } from './mediaRules';

const bytes = (...b: number[]) => new Uint8Array(b);
const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

describe('règles des images', () => {
  it('reconnaît le type par le contenu', () => {
    expect(sniffImageMime(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe('image/png');
    expect(sniffImageMime(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toBe('image/webp');
    expect(sniffImageMime(bytes(0, 0, 0, 0x18, ...ascii('ftypheic')))).toBe('image/heic');
    expect(sniffImageMime(bytes(...ascii('%PDF-1.7')))).toBeNull();
  });

  it('refuse HEIC, les formats inconnus, les fichiers vides ou trop lourds', () => {
    expect(checkImage(bytes(0, 0, 0, 0x18, ...ascii('ftypheic')))).toMatchObject({ ok: false });
    expect(checkImage(bytes(...ascii('%PDF-1.7')))).toMatchObject({ ok: false });
    expect(checkImage(new Uint8Array())).toMatchObject({ ok: false });
    const huge = new Uint8Array(MEDIA_LIMITS.maxInputBytes + 1);
    huge.set([0xff, 0xd8, 0xff]);
    expect(checkImage(huge)).toMatchObject({ ok: false });
  });

  it('réduit sans déformer et sans agrandir', () => {
    expect(fitWithin(4000, 3000, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3000, 4000, 320)).toEqual({ width: 240, height: 320 });
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });
});
