import type { VendorMaturity } from '@system-map/shared'

export type VendorMetadata = {
  name: string // canonical display name
  domain: string
  category: string
  maturity: VendorMaturity
  aliases?: string[]
}

// Hand-curated vendor taxonomy (spec v1.2 §3). The category strings mirror a
// Magellan-style taxonomy so the demo UI looks analyst-curated. Keep adding to
// this as missing vendors turn up — keys are lowercased canonical names.
// Maturity: established = 15y+/dominant, growth = 5-15y/Series B+, emerging = <5y.
export const VENDOR_METADATA: Record<string, VendorMetadata> = {
  // Policy Admin / Core Systems
  guidewire: {
    name: 'Guidewire',
    domain: 'guidewire.com',
    category: 'Policy Admin',
    maturity: 'established',
    aliases: ['guidewire software'],
  },
  'duck creek': {
    name: 'Duck Creek',
    domain: 'duckcreek.com',
    category: 'Policy Admin',
    maturity: 'established',
    aliases: ['duck creek technologies'],
  },
  sapiens: {
    name: 'Sapiens',
    domain: 'sapiens.com',
    category: 'Policy Admin',
    maturity: 'established',
  },
  insurity: {
    name: 'Insurity',
    domain: 'insurity.com',
    category: 'Policy Admin',
    maturity: 'established',
  },
  majesco: {
    name: 'Majesco',
    domain: 'majesco.com',
    category: 'Policy Admin',
    maturity: 'established',
  },
  socotra: { name: 'Socotra', domain: 'socotra.com', category: 'Policy Admin', maturity: 'growth' },

  // Underwriter Workbench
  send: {
    name: 'Send',
    domain: 'send.technology',
    category: 'Underwriter Workbench',
    maturity: 'growth',
    aliases: ['send technology', 'send technology solutions'],
  },
  'artificial labs': {
    name: 'Artificial Labs',
    domain: 'artificial.io',
    category: 'Underwriter Workbench',
    maturity: 'growth',
    aliases: ['artificial'],
  },
  cytora: {
    name: 'Cytora',
    domain: 'cytora.com',
    category: 'Underwriter Workbench',
    maturity: 'growth',
  },
  concirrus: {
    name: 'Concirrus',
    domain: 'concirrus.com',
    category: 'Underwriter Workbench',
    maturity: 'growth',
  },

  // Pricing & Rating
  hyperexponential: {
    name: 'hyperexponential',
    domain: 'hyperexponential.com',
    category: 'Pricing & Rating',
    maturity: 'growth',
    aliases: ['hx'],
  },
  akur8: { name: 'Akur8', domain: 'akur8.com', category: 'Pricing & Rating', maturity: 'growth' },

  // Claims
  'shift technology': {
    name: 'Shift Technology',
    domain: 'shift-technology.com',
    category: 'Claims · Fraud',
    maturity: 'growth',
    aliases: ['shift'],
  },
  tractable: {
    name: 'Tractable',
    domain: 'tractable.ai',
    category: 'Claims · Damage Assessment',
    maturity: 'growth',
  },
  'sprout.ai': {
    name: 'Sprout.ai',
    domain: 'sprout.ai',
    category: 'Claims',
    maturity: 'emerging',
    aliases: ['sprout ai', 'sprout'],
  },
  snapsheet: {
    name: 'Snapsheet',
    domain: 'snapsheetclaims.com',
    category: 'Claims',
    maturity: 'growth',
  },
  friss: { name: 'FRISS', domain: 'friss.com', category: 'Claims · Fraud', maturity: 'growth' },

  // Data & Analytics (horizontals)
  snowflake: {
    name: 'Snowflake',
    domain: 'snowflake.com',
    category: 'Data & Analytics',
    maturity: 'established',
  },
  databricks: {
    name: 'Databricks',
    domain: 'databricks.com',
    category: 'Data & Analytics',
    maturity: 'established',
  },

  // Cloud / Infra + Productivity (horizontals)
  aws: {
    name: 'AWS',
    domain: 'aws.amazon.com',
    category: 'Cloud / Infra',
    maturity: 'established',
    aliases: ['amazon web services'],
  },
  salesforce: {
    name: 'Salesforce',
    domain: 'salesforce.com',
    category: 'Productivity',
    maturity: 'established',
  },
}

/** Lowercase, strip punctuation, collapse whitespace — the matching key form. */
export function normaliseVendorQuery(q: string): string {
  return q
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
}

/** Find static metadata for a query by direct key or alias match, else null. */
export function findVendorMetadata(q: string): VendorMetadata | null {
  const norm = normaliseVendorQuery(q)
  if (VENDOR_METADATA[norm]) return VENDOR_METADATA[norm]
  for (const value of Object.values(VENDOR_METADATA)) {
    if (value.aliases?.some((a) => normaliseVendorQuery(a) === norm)) return value
  }
  return null
}
