# Mithran — Jothidam Reference Guide (Ember + Spring drop-in artifacts)

Standalone artifacts for teams embedding the **Jothidam Reference Guide**
(ஜோதிட அடிப்படை வழிகாட்டி) into an Ember Octane + Spring Boot stack.
The production UI of Mithran Predictions ships the same guide as a React page
(`src/components/ReferenceGuide.tsx`); both consume **one bilingual dataset**.

## Single source of truth

| File | Consumed by |
|---|---|
| `app/data/jothidam-reference-data.js` | Ember Octane app (ES module, `RASI_REF`, `NAKSHATRA_REF`, `BHAVA_REF`, `DASA_YEARS`, `PLANET_NAMES`, `degreeToNakshatra()`) |
| `src/main/resources/jothidam-reference-metadata.json` | Spring Boot classpath resource served by the REST endpoint |
| `../src/data/jothidam-reference-data.ts` | React/TypeScript implementation (typed superset of the same data) |

Regenerate the JSON whenever the `.js` dataset changes:

```bash
node --input-type=module -e "
import { writeFileSync } from 'fs';
import * as m from './app/data/jothidam-reference-data.js';
writeFileSync('src/main/resources/jothidam-reference-metadata.json', JSON.stringify({
  dasaYears: m.DASA_YEARS, planets: m.PLANET_NAMES, rasis: m.RASI_REF,
  nakshatras: m.NAKSHATRA_REF, lordStars: m.LORD_STARS, bhavas: m.BHAVA_REF,
}, null, 2));
"
```

## Spring Boot endpoint

`ReferenceMetadataController` exposes:

```
GET /api/v1/reference/metadata   → application/json (Cache-Control: max-age=86400)
```

Payload: 12 Rasi dignities (Aatchi own lords, Ucham + Paramocham degrees,
Neecham + Paramoneecham degrees, Rahu/Ketu traditional positions), the 27
Nakshatras with 13°20' spans + Vimshottari star lords + dasa years, and the
12 Bhava responsibilities directory (categories + bilingual signification lists).

## Ember Octane usage

```js
// app/services/reference-data.js  (or import the module directly)
import { RASI_REF, NAKSHATRA_REF, BHAVA_REF, degreeToNakshatra } from 'my-app/data/jothidam-reference-data';

// local fallback / offline mode: read the module synchronously
const jupiterExalt = RASI_REF[3].exalt; // Kadagam 5°

// or fetch from Spring for a live single source of truth:
// const meta = await (await fetch('/api/v1/reference/metadata')).json();
```

## Data guarantees

- Dignity table verified against the classical consensus (exalt Sun 10° Mesha …
  Venus 27° Meenam; debilitation exactly opposite; Rahu 20° Rishabam / Ketu 20°
  Vrichikam as traditional positions).
- 27 star spans are exact: `index * 360/27` to `(index+1) * 360/27` at 13°20′ per star.
- Vimshottari order Ketu 7 → Venus 20 → Sun 6 → Moon 10 → Mars 7 → Rahu 18 →
  Jupiter 16 → Saturn 19 → Mercury 17; 3 stars per lord.
- Every string is bilingual (Tamil + English) — no placeholders.
