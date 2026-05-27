import type { VendorMaturity } from '@system-map/shared'

export type VendorMetadata = {
  name: string // canonical display name
  domain: string
  category: string
  maturity: VendorMaturity
  aliases?: string[]
  // Explicit Wikipedia article title. Only set where the plain name resolves
  // correctly to the company — many vendor names hit a disambiguation page or
  // an unrelated article (e.g. "Cytora" is a snail), so we only fetch Wikipedia
  // when we know the right title. Absent ⇒ skip Wikipedia for this vendor.
  wikiTitle?: string
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
    wikiTitle: 'Guidewire Software',
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
    wikiTitle: 'Snowflake Inc.',
  },
  databricks: {
    name: 'Databricks',
    domain: 'databricks.com',
    category: 'Data & Analytics',
    maturity: 'established',
    wikiTitle: 'Databricks',
  },

  // Cloud / Infra + Productivity (horizontals)
  aws: {
    name: 'AWS',
    domain: 'aws.amazon.com',
    category: 'Cloud / Infra',
    maturity: 'established',
    aliases: ['amazon web services'],
    wikiTitle: 'Amazon Web Services',
  },
  salesforce: {
    name: 'Salesforce',
    domain: 'salesforce.com',
    category: 'Productivity',
    maturity: 'established',
    wikiTitle: 'Salesforce',
  },

  // Policy Admin / Core Systems (more)
  'eis group': {
    name: 'EIS Group',
    domain: 'eisgroup.com',
    category: 'Policy Admin',
    maturity: 'established',
    aliases: ['eis'],
  },
  instanda: {
    name: 'INSTANDA',
    domain: 'instanda.com',
    category: 'Policy Admin',
    maturity: 'growth',
  },

  // Underwriter Workbench (more)
  'atticus.ai': {
    name: 'Atticus.ai',
    domain: 'atticus.ai',
    category: 'Underwriter Workbench',
    maturity: 'emerging',
    aliases: ['atticus'],
  },
  quotech: {
    name: 'Quotech',
    domain: 'quotech.io',
    category: 'Underwriter Workbench',
    maturity: 'emerging',
  },

  // Claims (more)
  claimvantage: {
    name: 'ClaimVantage',
    domain: 'claimvantage.com',
    category: 'Claims',
    maturity: 'growth',
  },

  // Distribution / Broker tech + Lloyd's-specific
  whitespace: {
    name: 'Whitespace',
    domain: 'whitespace.co',
    category: "Distribution · Lloyd's",
    maturity: 'growth',
    aliases: ['whitespace software'],
  },
  ppl: {
    name: 'PPL',
    domain: 'pplfirst.com',
    category: "Distribution · Lloyd's",
    maturity: 'established',
    aliases: ['placing platform', 'placing platform limited'],
  },
  acturis: {
    name: 'Acturis',
    domain: 'acturis.com',
    category: 'Distribution',
    maturity: 'established',
  },
  'applied systems': {
    name: 'Applied Systems',
    domain: 'appliedsystems.com',
    category: 'Distribution',
    maturity: 'established',
  },
  vertafore: {
    name: 'Vertafore',
    domain: 'vertafore.com',
    category: 'Distribution',
    maturity: 'established',
  },
  novidea: { name: 'Novidea', domain: 'novidea.com', category: 'Distribution', maturity: 'growth' },
  dxc: {
    name: 'DXC Technology',
    domain: 'dxc.com',
    category: "Distribution · Lloyd's",
    maturity: 'established',
    aliases: ['dxc technology'],
    wikiTitle: 'DXC Technology',
  },

  // Pricing & Rating (more)
  earnix: {
    name: 'Earnix',
    domain: 'earnix.com',
    category: 'Pricing & Rating',
    maturity: 'growth',
  },
  quantee: {
    name: 'Quantee',
    domain: 'quantee.com',
    category: 'Pricing & Rating',
    maturity: 'emerging',
  },

  // Data & Analytics (more)
  'dbt labs': {
    name: 'dbt Labs',
    domain: 'getdbt.com',
    category: 'Data & Analytics',
    maturity: 'growth',
    aliases: ['dbt'],
  },
  fivetran: {
    name: 'Fivetran',
    domain: 'fivetran.com',
    category: 'Data & Analytics',
    maturity: 'growth',
    wikiTitle: 'Fivetran',
  },
  looker: {
    name: 'Looker',
    domain: 'looker.com',
    category: 'Data & Analytics',
    maturity: 'established',
    wikiTitle: 'Looker (company)',
  },

  // Cloud / Infra (more)
  azure: {
    name: 'Microsoft Azure',
    domain: 'azure.microsoft.com',
    category: 'Cloud / Infra',
    maturity: 'established',
    aliases: ['microsoft azure'],
    wikiTitle: 'Microsoft Azure',
  },
  gcp: {
    name: 'Google Cloud',
    domain: 'cloud.google.com',
    category: 'Cloud / Infra',
    maturity: 'established',
    aliases: ['google cloud', 'google cloud platform'],
    wikiTitle: 'Google Cloud Platform',
  },
  cloudflare: {
    name: 'Cloudflare',
    domain: 'cloudflare.com',
    category: 'Cloud / Infra',
    maturity: 'established',
    wikiTitle: 'Cloudflare',
  },

  // Productivity (more)
  'microsoft 365': {
    name: 'Microsoft 365',
    domain: 'microsoft.com',
    category: 'Productivity',
    maturity: 'established',
    aliases: ['office 365', 'm365', 'microsoft office'],
  },
  slack: {
    name: 'Slack',
    domain: 'slack.com',
    category: 'Productivity',
    maturity: 'established',
    wikiTitle: 'Slack (software)',
  },
  zoom: {
    name: 'Zoom',
    domain: 'zoom.us',
    category: 'Productivity',
    maturity: 'established',
    aliases: ['zoom video'],
  },
  docusign: {
    name: 'DocuSign',
    domain: 'docusign.com',
    category: 'Productivity',
    maturity: 'established',
    wikiTitle: 'DocuSign',
  },

  // Compliance / Risk
  onetrust: {
    name: 'OneTrust',
    domain: 'onetrust.com',
    category: 'Compliance / Risk',
    maturity: 'growth',
  },
  servicenow: {
    name: 'ServiceNow',
    domain: 'servicenow.com',
    category: 'Compliance / Risk',
    maturity: 'established',
    aliases: ['servicenow grc'],
    wikiTitle: 'ServiceNow',
  },
  resolver: {
    name: 'Resolver',
    domain: 'resolver.com',
    category: 'Compliance / Risk',
    maturity: 'growth',
  },
  logicgate: {
    name: 'LogicGate',
    domain: 'logicgate.com',
    category: 'Compliance / Risk',
    maturity: 'growth',
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
