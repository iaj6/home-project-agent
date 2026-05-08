import { zipToState } from '../tools/cost-guide';

export interface ZipEnrichment {
  zipCode: string;
  state: string | null;
  stateName: string | null;
  frostDepthInches: number | null;
  climateBand: 'hot' | 'mixed' | 'cold' | 'very-cold' | null;
  isLikelyCoastal: boolean;
  notes: string[];
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota',
  MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

// Approximate frost depth in inches, by state. These are common builder rules-of-thumb;
// any specific town may require more depending on local code. Use as a starting point.
const FROST_DEPTH: Record<string, number> = {
  AK: 100, MN: 60, ND: 60, ME: 48, NH: 48, VT: 48, WI: 48, MI: 48, MT: 48, ID: 48,
  WY: 48, SD: 48, MA: 48, NY: 42, IA: 42, IL: 42, IN: 42, OH: 42, PA: 42, NE: 42,
  CT: 42, RI: 42, NJ: 36, KS: 36, MO: 36, CO: 36, UT: 30, KY: 30, WV: 30, MD: 30,
  DE: 30, DC: 30, NV: 24, VA: 24, NM: 18, OR: 18, WA: 18, OK: 18, AR: 18, CA: 12,
  TN: 12, NC: 12, AZ: 6, SC: 6, GA: 6, AL: 6, MS: 6, LA: 6, TX: 6, FL: 0, HI: 0,
};

const CLIMATE_BAND: Record<string, ZipEnrichment['climateBand']> = {
  AK: 'very-cold',
  MN: 'very-cold', ND: 'very-cold', ME: 'very-cold', WI: 'very-cold', MT: 'very-cold',
  NH: 'cold', VT: 'cold', MI: 'cold', SD: 'cold', WY: 'cold', ID: 'cold', MA: 'cold',
  NY: 'cold', IA: 'cold', IL: 'cold', PA: 'cold', NE: 'cold', CT: 'cold', RI: 'cold',
  IN: 'mixed', OH: 'mixed', MO: 'mixed', NJ: 'mixed', CO: 'mixed', UT: 'mixed',
  KS: 'mixed', KY: 'mixed', WV: 'mixed', MD: 'mixed', DE: 'mixed', DC: 'mixed',
  VA: 'mixed', NV: 'mixed', NM: 'mixed', OR: 'mixed', WA: 'mixed', OK: 'mixed',
  AR: 'mixed', TN: 'mixed', NC: 'mixed', CA: 'mixed',
  SC: 'hot', GA: 'hot', AL: 'hot', MS: 'hot', LA: 'hot', TX: 'hot', AZ: 'hot',
  FL: 'hot', HI: 'hot',
};

// Coastal ZIP-prefix list (3-digit). Not exhaustive — meant to flag the major
// shoreline regions where wetlands/conservation/saltwater hardware come up.
// Match is on first 3 digits of the ZIP. Inland prefixes inside coastal states
// are deliberately excluded.
const COASTAL_PREFIXES: Set<string> = new Set([
  // New England + NY/NJ shore
  '014', '015', '019', '020', '021', '023', '024', '025', '026', '027', '028',
  '029', '030', '031', '032', '038', '039', '040', '041', '042', '043', '044',
  '045', '046', '047', '048', '060', '063', '064', '068', '069', '070', '071',
  '072', '073', '074', '076', '079', '083', '084', '085', '086', '107', '108',
  '109', '110', '111', '112', '113', '114', '115', '116', '117', '118', '119',
  // Mid-Atlantic
  '194', '197', '198', '199', '208', '209', '215', '216', '217', '218', '219',
  '232', '233', '234', '235', '236', '238', '239', '244', '245', '275', '276',
  '278', '279', '280', '281', '283', '284', '285', '294', '295', '296', '297',
  // Southeast / Gulf
  '299', '300', '301', '309', '310', '312', '313', '314', '315', '316', '317',
  '318', '319', '320', '321', '322', '323', '324', '325', '326', '327', '328',
  '329', '330', '331', '332', '333', '334', '335', '336', '337', '338', '339',
  '341', '342', '344', '346', '347', '349', '395', '396', '397', '700', '701',
  '703', '704', '705', '706', '707', '708', '770', '771', '772', '773', '774',
  '775', '776', '777', '778', '779', '780', '781', '782', '783', '784',
  // Pacific
  '900', '901', '902', '903', '904', '905', '906', '907', '908', '910', '911',
  '912', '913', '914', '915', '916', '917', '918', '919', '920', '921', '922',
  '923', '924', '925', '926', '927', '928', '930', '931', '932', '933', '934',
  '935', '936', '937', '939', '940', '941', '943', '944', '945', '946', '947',
  '948', '949', '950', '951', '952', '953', '954', '955', '959', '960', '961',
  '962', '963', '964', '965', '966', '967', '968', '969', '970', '971', '972',
  '973', '974', '975', '976', '977', '978', '979', '980', '981', '982', '983',
  '984', '985', '986', '987', '988', '989', '990', '991', '993', '994', '995',
  '996', '997', '998', '999',
]);

export function enrichZip(zipCode: string): ZipEnrichment {
  const state = zipToState(zipCode);
  const stateName = state ? STATE_NAMES[state] ?? null : null;
  const frostDepthInches = state ? FROST_DEPTH[state] ?? null : null;
  const climateBand = state ? CLIMATE_BAND[state] ?? null : null;

  const prefix = zipCode.replace(/\D/g, '').slice(0, 3);
  const isLikelyCoastal = COASTAL_PREFIXES.has(prefix);

  const notes: string[] = [];
  if (frostDepthInches != null && frostDepthInches >= 36) {
    notes.push(`Frost-depth footings: dig ${frostDepthInches}" minimum.`);
  } else if (frostDepthInches != null && frostDepthInches > 0) {
    notes.push(`Mild frost zone: ${frostDepthInches}" footing depth typical.`);
  } else if (frostDepthInches === 0) {
    notes.push('No frost line concern.');
  }
  if (isLikelyCoastal) {
    notes.push(
      'Coastal area: salt exposure → use stainless or hot-dip galvanized hardware. Wetlands or Conservation Commission review may apply.',
    );
  }

  return {
    zipCode,
    state,
    stateName,
    frostDepthInches,
    climateBand,
    isLikelyCoastal,
    notes,
  };
}

export function formatEnrichmentForPrompt(e: ZipEnrichment): string {
  const lines = [
    `- ZIP: ${e.zipCode}`,
    e.stateName ? `- State: ${e.stateName} (${e.state})` : null,
    e.frostDepthInches != null ? `- Frost depth (typical): ${e.frostDepthInches} inches` : null,
    e.climateBand ? `- Climate band: ${e.climateBand}` : null,
    `- Coastal/wetlands likely: ${e.isLikelyCoastal ? 'yes' : 'no'}`,
    ...e.notes.map((n) => `- ${n}`),
  ].filter(Boolean);
  return lines.join('\n');
}
