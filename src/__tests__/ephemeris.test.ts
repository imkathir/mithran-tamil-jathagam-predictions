// 30-case ephemeris verification gate (spec-locked).
// Pipeline under test — engine.ts implements EXACTLY the mandated flow:
//   UTC Date from local time + timezoneOffsetMinutes (utcMs = Date.UTC(...) - tz*60000);
//   Lahiri ayanamsa 23.857092 + 1.396971*T + 0.0003086*T^2 (Vakya = ayanamsa - 1.45);
//   astronomy-engine Ecliptic(GeoVector(body, date, true)).elon geocentric longitudes;
//   siderealLon = norm360(tropical - ayanamsa); rasiIndex = floor(sid/30) (0=Mesham..11=Meenam);
//   retrograde via +1h longitude probe wrapped to [-180,180]; mean node Rahu/Ketu;
//   GAST (Astronomy.SiderealTime) RAMC with quadrant-safe atan2 ascendant.
// Anchor cases (first 6) assert independently known positions (spec + published panchangam);
// the remaining 24 are decade/hemisphere regression locks from the verified VSOP87 core.
import { describe, it, expect } from 'vitest';
import { computeDossier, navamsaRasi, lahiriAyanamsa, norm360, type BirthProfile } from '../engine';

const RASI_OF = (lon: number) => Math.floor(norm360(lon) / 30);

interface Case {
  name: string; date: string; time: string; lat: number; lon: number; tz: number;
  expectLagna: number; expect: Record<string, number>;
}

const cases: Case[] = [
  // ===== 6 spec anchors (independently verified expectations) =====
  { name: '1995-09-10 16:20 Pollachi (spec anchor: Saturn Kumbam)', date: '1995-09-10', time: '16:20', lat: 10.6583, lon: 77.0089, tz: 330, expectLagna: 9, expect: { Sun: 4, Moon: 11, Mars: 6, Mercury: 5, Jupiter: 7, Venus: 4, Saturn: 10, Rahu: 6, Ketu: 0 } },
  { name: '1998-05-04 16:36 Udumalpet (spec anchor: Lagna Kanni, Sun/Mars/Saturn Mesham)', date: '1998-05-04', time: '16:36', lat: 10.5881, lon: 77.2478, tz: 330, expectLagna: 5, expect: { Sun: 0, Mars: 0, Saturn: 0, Moon: 4, Mercury: 11, Jupiter: 10, Venus: 11, Rahu: 4, Ketu: 10 } },
  { name: '2025-07-09 17:25 Udumalpet (spec anchor: Lagna+Moon Dhanusu, Venus Rishabam)', date: '2025-07-09', time: '17:25', lat: 10.5881, lon: 77.2478, tz: 330, expectLagna: 8, expect: { Moon: 8, Venus: 1, Sun: 2, Mars: 4, Mercury: 3, Jupiter: 2, Saturn: 11, Rahu: 10, Ketu: 4 } },
  { name: '2021-02-10 00:00 Chennai (spec anchor: 6 planets Makaram)', date: '2021-02-10', time: '00:00', lat: 13.0827, lon: 80.2707, tz: 330, expectLagna: 6, expect: { Sun: 9, Moon: 9, Mercury: 9, Jupiter: 9, Venus: 9, Saturn: 9, Mars: 0, Rahu: 1, Ketu: 7 } },
  { name: '1947-08-15 00:00 Delhi (spec anchor: Rishabam Lagna, independence day)', date: '1947-08-15', time: '00:00', lat: 28.6135, lon: 77.209, tz: 330, expectLagna: 1, expect: { Sun: 3, Moon: 3, Mars: 2, Mercury: 3, Jupiter: 6, Venus: 3, Saturn: 3, Rahu: 1, Ketu: 7 } },
  { name: '2000-09-15 18:00 Sydney (spec anchor: Meenam Lagna, southern hemisphere)', date: '2000-09-15', time: '18:00', lat: -33.8688, lon: 151.2093, tz: 600, expectLagna: 11, expect: { Sun: 4, Moon: 11, Mars: 4, Mercury: 5, Jupiter: 1, Venus: 5, Saturn: 1, Rahu: 2, Ketu: 8 } },
  // ===== 24 regression locks: decades 1950–2026, hemispheres, ±longitude/timezones =====
  { name: '1950-05-15 15:45 Salem IN', date: '1950-05-15', time: '15:45', lat: 11.6643, lon: 78.146, tz: 330, expectLagna: 5, expect: { Sun: 1, Moon: 0, Mars: 4, Mercury: 0, Jupiter: 10, Venus: 11, Saturn: 4, Rahu: 11, Ketu: 5 } },
  { name: '1962-11-15 12:00 Kolkata', date: '1962-11-15', time: '12:00', lat: 22.5726, lon: 88.3639, tz: 330, expectLagna: 9, expect: { Sun: 6, Moon: 2, Mars: 3, Mercury: 6, Jupiter: 10, Venus: 6, Saturn: 9, Rahu: 3, Ketu: 9 } },
  { name: '1969-07-20 20:17 Houston (Apollo 11)', date: '1969-07-20', time: '20:17', lat: 29.7604, lon: -95.3698, tz: -360, expectLagna: 9, expect: { Sun: 3, Moon: 5, Mars: 7, Mercury: 3, Jupiter: 5, Venus: 1, Saturn: 0, Rahu: 11, Ketu: 5 } },
  { name: '1975-08-15 09:00 Mumbai', date: '1975-08-15', time: '09:00', lat: 19.076, lon: 72.8777, tz: 330, expectLagna: 5, expect: { Sun: 3, Moon: 7, Mars: 1, Mercury: 4, Jupiter: 0, Venus: 4, Saturn: 3, Rahu: 7, Ketu: 1 } },
  { name: '1982-03-04 14:30 Salem IN', date: '1982-03-04', time: '14:30', lat: 11.6643, lon: 78.146, tz: 330, expectLagna: 2, expect: { Sun: 10, Moon: 2, Mars: 5, Mercury: 9, Jupiter: 6, Venus: 9, Saturn: 5, Rahu: 2, Ketu: 8 } },
  { name: '1990-01-26 06:00 Delhi', date: '1990-01-26', time: '06:00', lat: 28.6135, lon: 77.209, tz: 330, expectLagna: 8, expect: { Sun: 9, Moon: 9, Mars: 8, Mercury: 8, Jupiter: 2, Venus: 9, Saturn: 8, Rahu: 9, Ketu: 3 } },
  { name: '1993-07-16 20:00 Salem IN (eclipse season)', date: '1993-07-16', time: '20:00', lat: 11.6643, lon: 78.146, tz: 330, expectLagna: 9, expect: { Sun: 3, Moon: 1, Mars: 4, Mercury: 2, Jupiter: 5, Venus: 1, Saturn: 10, Rahu: 7, Ketu: 1 } },
  { name: '1998-03-08 03:00 Colombo', date: '1998-03-08', time: '03:00', lat: 6.9271, lon: 79.8612, tz: 330, expectLagna: 8, expect: { Sun: 10, Moon: 2, Mars: 11, Mercury: 11, Jupiter: 10, Venus: 9, Saturn: 11, Rahu: 4, Ketu: 10 } },
  { name: '1999-08-11 12:00 Paris (total eclipse)', date: '1999-08-11', time: '12:00', lat: 48.8566, lon: 2.3522, tz: 60, expectLagna: 6, expect: { Sun: 3, Moon: 3, Mars: 6, Mercury: 3, Jupiter: 0, Venus: 4, Saturn: 0, Rahu: 3, Ketu: 9 } },
  { name: '2000-01-01 00:00 Tokyo (Y2K)', date: '2000-01-01', time: '00:00', lat: 35.6762, lon: 139.6503, tz: 540, expectLagna: 5, expect: { Sun: 8, Moon: 6, Mars: 10, Mercury: 8, Jupiter: 0, Venus: 7, Saturn: 0, Rahu: 3, Ketu: 9 } },
  { name: '2004-12-26 09:00 Banda Aceh (eclipse)', date: '2004-12-26', time: '09:00', lat: 5.5483, lon: 95.3238, tz: 420, expectLagna: 9, expect: { Sun: 8, Moon: 2, Mars: 7, Mercury: 7, Jupiter: 5, Venus: 7, Saturn: 3, Rahu: 0, Ketu: 6 } },
  { name: '2005-10-03 12:00 Madrid (annular eclipse)', date: '2005-10-03', time: '12:00', lat: 40.4168, lon: -3.7038, tz: 60, expectLagna: 7, expect: { Sun: 5, Moon: 5, Mars: 0, Mercury: 5, Jupiter: 6, Venus: 7, Saturn: 3, Rahu: 11, Ketu: 5 } },
  { name: '2008-08-01 19:00 London (negative longitude)', date: '2008-08-01', time: '19:00', lat: 51.5074, lon: -0.1278, tz: 60, expectLagna: 8, expect: { Sun: 3, Moon: 3, Mars: 4, Mercury: 3, Jupiter: 8, Venus: 4, Saturn: 4, Rahu: 9, Ketu: 3 } },
  { name: '2010-04-15 12:00 Salem IN', date: '2010-04-15', time: '12:00', lat: 11.6643, lon: 78.146, tz: 330, expectLagna: 2, expect: { Sun: 0, Moon: 0, Mars: 3, Mercury: 0, Jupiter: 10, Venus: 0, Saturn: 5, Rahu: 8, Ketu: 2 } },
  { name: '2012-12-21 12:00 Mexico City (negative tz)', date: '2012-12-21', time: '12:00', lat: 19.4326, lon: -99.1332, tz: -360, expectLagna: 10, expect: { Sun: 8, Moon: 11, Mars: 9, Mercury: 7, Jupiter: 1, Venus: 7, Saturn: 6, Rahu: 7, Ketu: 1 } },
  { name: '2013-11-03 12:00 Kampala (equator)', date: '2013-11-03', time: '12:00', lat: 0.3476, lon: 32.5825, tz: 120, expectLagna: 9, expect: { Sun: 6, Moon: 6, Mars: 4, Mercury: 6, Jupiter: 2, Venus: 8, Saturn: 6, Rahu: 6, Ketu: 0 } },
  { name: '2016-08-05 20:00 Rio (Olympics, S hemisphere)', date: '2016-08-05', time: '20:00', lat: -22.9068, lon: -43.1729, tz: -180, expectLagna: 10, expect: { Sun: 3, Moon: 4, Mars: 7, Mercury: 4, Jupiter: 4, Venus: 4, Saturn: 7, Rahu: 4, Ketu: 10 } },
  { name: '2017-08-21 18:00 Nashville (US eclipse)', date: '2017-08-21', time: '18:00', lat: 36.1627, lon: -86.7816, tz: -300, expectLagna: 9, expect: { Sun: 4, Moon: 4, Mars: 3, Mercury: 4, Jupiter: 5, Venus: 3, Saturn: 7, Rahu: 3, Ketu: 9 } },
  { name: '2019-11-26 12:00 Coimbatore', date: '2019-11-26', time: '12:00', lat: 11.0168, lon: 76.9558, tz: 330, expectLagna: 10, expect: { Sun: 7, Moon: 7, Mars: 6, Mercury: 6, Jupiter: 8, Venus: 8, Saturn: 8, Rahu: 2, Ketu: 8 } },
  { name: '2020-06-21 12:00 Chennai (annular eclipse)', date: '2020-06-21', time: '12:00', lat: 13.0827, lon: 80.2707, tz: 330, expectLagna: 5, expect: { Sun: 2, Moon: 2, Mars: 11, Mercury: 2, Jupiter: 9, Venus: 1, Saturn: 9, Rahu: 2, Ketu: 8 } },
  { name: '2022-11-08 20:00 Salem IN (lunar eclipse)', date: '2022-11-08', time: '20:00', lat: 11.6643, lon: 78.146, tz: 330, expectLagna: 1, expect: { Sun: 6, Moon: 0, Mars: 2, Mercury: 6, Jupiter: 11, Venus: 6, Saturn: 9, Rahu: 0, Ketu: 6 } },
  { name: '2023-04-20 12:00 Perth (hybrid eclipse, S)', date: '2023-04-20', time: '12:00', lat: -31.9505, lon: 115.8605, tz: 480, expectLagna: 2, expect: { Sun: 0, Moon: 0, Mars: 2, Mercury: 0, Jupiter: 11, Venus: 1, Saturn: 10, Rahu: 0, Ketu: 6 } },
  { name: '2024-04-08 20:00 Dallas (total eclipse)', date: '2024-04-08', time: '20:00', lat: 32.7767, lon: -96.797, tz: -300, expectLagna: 5, expect: { Sun: 11, Moon: 11, Mars: 10, Mercury: 0, Jupiter: 0, Venus: 11, Saturn: 10, Rahu: 11, Ketu: 5 } },
  { name: '2026-08-12 19:00 Reykjavik (high latitude)', date: '2026-08-12', time: '19:00', lat: 64.1466, lon: -21.9426, tz: 0, expectLagna: 7, expect: { Sun: 3, Moon: 3, Mars: 2, Mercury: 3, Jupiter: 3, Venus: 5, Saturn: 11, Rahu: 10, Ketu: 4 } },
];

function run(c: Case) {
  const profile: BirthProfile = {
    name: 't', date: c.date, time: c.time, placeName: c.name,
    latitude: c.lat, longitude: c.lon, timezoneOffsetMinutes: c.tz, panchangamMode: 'THIRUKANITHAM',
  };
  return computeDossier(profile, c.date);
}

describe('Ephemeris 30-case gate', () => {
  it('suite defines exactly 30 cases', () => {
    expect(cases.length).toBe(30);
  });

  for (const c of cases) {
    it(c.name, () => {
      const d = run(c);
      // exact lagna rasiIndex (0 = Mesham .. 11 = Meenam)
      expect(d.lagnaRasi, 'lagna rasiIndex').toBe(c.expectLagna);
      expect(RASI_OF(d.lagnaLon), 'lagna rasiIndex from raw longitude').toBe(c.expectLagna);
      // exact rasiIndex for every graha
      for (const [id, rasi] of Object.entries(c.expect)) {
        const g = d.grahas.find((x) => x.id === id)!;
        expect(g.rasi, `${id} rasiIndex`).toBe(rasi);
        expect(RASI_OF(g.lon), `${id} rasiIndex from raw longitude`).toBe(rasi);
      }
    });
  }

  it('1995-09-10 Pollachi deep anchor: Saturn Kumbam 27-28°, Poorattathi 3, ஆட்சி, retro; D9 மிதுனம் with D9 lagna', () => {
    const d = run(cases[0]);
    const sat = d.grahas.find((g) => g.id === 'Saturn')!;
    const deg = sat.lon % 30;
    expect(sat.rasi).toBe(10);
    expect(deg).toBeGreaterThan(27.4);
    expect(deg).toBeLessThan(28.3);
    expect(sat.nakIdx).toBe(24); // பூரட்டாதி
    expect(sat.pada).toBe(3);
    expect(sat.dignityKey).toBe('own');
    expect(sat.retro).toBe(true);
    expect(navamsaRasi(sat.lon)).toBe(2); // மிதுனம்
    expect(navamsaRasi(d.lagnaLon)).toBe(2);
  });

  it('2021-02-10: exactly 6 planets (Sun, Moon, Mercury, Jupiter, Venus, Saturn) in Makaram', () => {
    const d = run(cases[3]);
    const inMak = d.grahas.filter((g) => g.rasi === 9).map((g) => g.id).sort();
    expect(inMak).toEqual(['Jupiter', 'Mercury', 'Moon', 'Saturn', 'Sun', 'Venus']);
  });

  it('retrograde rule (t+1h probe): Sun/Moon never retro, nodes always retro', () => {
    for (const c of [cases[0], cases[3]]) {
      const d = run(c);
      const by = (id: string) => d.grahas.find((g) => g.id === id)!;
      expect(by('Sun').retro, c.name).toBe(false);
      expect(by('Moon').retro, c.name).toBe(false);
      expect(by('Rahu').retro, c.name).toBe(true);
      expect(by('Ketu').retro, c.name).toBe(true);
    }
  });

  it('ayanamsa follows the mandated Lahiri polynomial exactly', () => {
    for (const jd of [2432375.5, 2449970.95139, 2451545.0, 2460865.0]) {
      const T = (jd - 2451545.0) / 36525;
      const want = norm360(23.857092 + 1.396971 * T + 0.0003086 * T * T);
      expect(Math.abs(lahiriAyanamsa(jd) - want), `JD ${jd}`).toBeLessThan(1e-9);
    }
  });

  it('VSOP87 accuracy: 1995-09-10 Saturn tropical 351.66° ± 0.02 (NASA RP-1349 RA/Dec)', () => {
    const d = run(cases[0]);
    const sat = d.grahas.find((g) => g.id === 'Saturn')!;
    const tropical = norm360(sat.lon + lahiriAyanamsa(2449970.95139));
    let diff = Math.abs(tropical - 351.66) % 360;
    if (diff > 180) diff = 360 - diff;
    expect(diff).toBeLessThan(0.02);
  });
});
