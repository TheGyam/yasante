export interface Resource {
  key: string;
  name: string;
  singular: string;
  group: string;
  icon: string;
  description: string;
  order: number;
  /** Shown under another tool rather than on its own (schedules under scheduled jobs). */
  parent?: string;
  url: string;
  addUrl: string | null;
  canView: boolean;
}

export interface Metric {
  label: string;
  hint: string;
  value: number;
  previous: number;
  /** Percent change against the week before; null when last week was zero. */
  change: number | null;
  values: number[];
  url: string;
}

export interface Queue {
  key: string;
  model: string;
  label: string;
  hint: string;
  count: number;
  url: string;
}

export interface NeedsItem {
  id: string;
  title: string;
  facts: string[];
  at: string;
  queue: string;
  url: string;
}

export interface AuditEntry {
  id: number;
  object: string;
  actor: string;
  action: string;
  at: string;
  url: string | null;
}

export interface Overview {
  user: { name: string; superuser: boolean; avatar?: string };
  csrfToken: string;
  models: Resource[];
  metrics: Metric[];
  queues: Queue[];
  status: Record<string, number>;
  totalOpen: number;
  needs: NeedsItem[];
  errors: { open: number; new: number };
  audit: AuditEntry[];
  trend: { dates: string[]; series: { label: string; values: number[]; url: string }[] };
  generatedAt: string;
}

export type CellKind = 'text' | 'bool' | 'status' | 'datetime' | 'number';

export interface Records {
  quickEditable?: boolean;
  name: string;
  description: string;
  singular: string;
  views: { name: string; query: string }[];
  columns: { key: string; label: string; sort: number | null; direction: 'asc' | 'desc' | null }[];
  rows: {
    id: string;
    values: string[];
    cells: { kind: CellKind; value: string | number | boolean | null }[];
    url: string;
  }[];
  count: number;
  page: number;
  pages: number;
  searchable: boolean;
  filters: { label: string; choices: { label: string; selected: boolean; query: string }[] }[];
  actions: { key: string; label: string }[];
  addUrl: string | null;
}

export interface ReviewContent {
  title: string;
  text?: string;
  author?: string;
  image?: string;
  url?: string;
}

export interface ReviewItem {
  id: string;
  title: string;
  at: string;
  facts: string[];
  text: string;
  images: string[];
  url: string;
  content?: ReviewContent;
  evidence?: string;
}

export interface ReviewQueue {
  name: string;
  key: string;
  items: ReviewItem[];
  next: string | null;
  actions: { key: string; label: string; shortcut: string; reversible: boolean }[];
}

export interface Decision {
  done: true;
  label: string;
  undo: string | null;
}

export interface InsightRow {
  label: string;
  values: number[];
  url?: string;
  x?: number;
  y?: number;
  rate?: number | null;
  active?: number;
  cohort?: number;
}

export interface Insight {
  name: string;
  title: string;
  kind: 'line' | 'area' | 'bar' | 'stacked-bar' | 'heatmap' | 'table';
  labels: string[];
  rows: InsightRow[];
  previous: InsightRow[] | null;
  meta: Record<string, number | string | null>;
  from: string;
  to: string;
}

export interface ErrorIssue {
  id: number;
  title: string;
  platform: string;
  count: number;
  users: number;
  first: string;
  last: string;
  version: string;
  status: 'open' | 'resolved' | 'ignored';
  regressed: boolean;
  note: string;
  resolvedInVersion: string;
  sparkline?: number[];
}

export interface ErrorIssues {
  items: ErrorIssue[];
  count: number;
  page: number;
  versions: string[];
}

export interface ErrorDetail extends ErrorIssue {
  editable: boolean;
  occurrences: {
    id: number;
    at: string;
    stack: string;
    device: string;
    os: string;
    version: string;
    path: string;
    user: string;
    userUrl: string | null;
  }[];
  trend: { day: string; app_version: string; value: number }[];
}

export interface SearchResults {
  groups: {
    name: string;
    items: { name: string; subtitle: string; url: string; icon: string }[];
  }[];
}

export interface Related {
  items: { name: string; relation: string; count: number; url: string }[];
}

export interface Field {
  /** Personal and hidden until someone allowed asks (see apps/staff/privacy.py). */
  masked?: boolean;
  hasValue?: boolean;
  canReveal?: boolean;
  revealPath?: string;
  delimiter?: string;
  name: string;
  label: string;
  help?: string;
  errors: string[];
  kind: string;
  value: string | number | boolean | string[];
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  options?: { value: string; label: string }[];
  maxLength?: number;
  min?: number;
  max?: number;
  step?: string;
}

export interface Section {
  name: string;
  description: string;
  fields: Field[];
}

export interface InlineForm {
  sections: Section[];
  id: string;
  errors: string[];
  canDelete: boolean;
}

export interface FormSchema {
  canResetTwoFactor?: boolean;
  name: string;
  singular: string;
  title: string;
  object: string;
  id: string | null;
  revision: string;
  sections: Section[];
  errors: string[];
  editable: boolean;
  canDelete: boolean;
  canSaveAs: boolean;
  password: boolean;
  prepopulated: Record<string, string[]>;
  inlines: {
    prefix: string;
    name: string;
    management: Field[];
    forms: InlineForm[];
    empty: { fields: Field[] };
    errors: string[];
    canAdd: boolean;
    max: number;
    count: number;
    page: number;
    pages: number;
  }[];
}

export interface Saved {
  saved: true;
  id: string;
  url: string;
}

export interface Deletion {
  objects: (string | unknown[])[];
  counts: Record<string, number>;
  permissions: string[];
  protected: string[];
  revision: string;
  canDelete: boolean;
}

export interface ActionPreview {
  count: number;
  label: string;
  token: string;
  deletion: Deletion | null;
  done?: boolean;
  messages?: { message: string; level: number }[];
}

export interface QuickSchema {
  name: string;
  revision: string;
  management: Field[];
  errors: string[];
  forms: { label: string; fields: Field[]; errors: string[] }[];
}
export interface Metrics {
  activated: number;
  completion: string;
  response: string;
  requests_30d: number;
  weeks: Record<string, string | number>[];
}
export interface Session {
  authenticated: boolean;
  phase: 'password' | 'enroll' | 'verify';
  csrfToken: string;
}
export interface Factor {
  phase: 'enroll' | 'verify';
  secret?: string;
  uri?: string;
}
export interface FactorVerified {
  verified: true;
  recoveryCodes: string[];
}

export interface FieldCommon {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export type BroadcastKind = 'update' | 'news';

export interface Audience {
  who: 'everyone' | 'clients' | 'stylists' | 'people';
  area: string;
  platform: 'any' | 'ios' | 'android';
  joined: 'any' | '7' | '30' | '90';
  people: string[];
}

export interface Reach {
  matched: number;
  reachable: number;
  noDevice: number;
  notOptedIn: number;
  summary: string;
}

export interface BroadcastRecord {
  id: number;
  kind: BroadcastKind;
  title: string;
  body: string;
  url: string;
  audience: string;
  recipients: number;
  sentBy: string;
  at: string;
  finished: boolean;
  /** Apple or Google took it for the phone. */
  delivered: number;
  /** Expo took it; Apple or Google's answer isn't in yet. */
  accepted: number;
  /** The server only logged it: push delivery is switched off. */
  logged: number;
  failed: number;
  waiting: number;
  noDevice: number;
  /** The commonest failure, explained. */
  problem: string;
}

export interface PushHealth {
  sending: boolean;
  phones: Record<string, number>;
  people: number;
  lastDay: Record<string, number>;
  problems: { problem: string; count: number }[];
  yours: number;
  /** When Apple and Google's answers were last read; null if never. */
  receiptsCheckedAt: string | null;
}

export interface Broadcasts {
  items: BroadcastRecord[];
  canSend: boolean;
  newsTooSoon: boolean;
}

export interface FeaturedSummary {
  id: string;
  display_name: string;
  handle: string;
  instagram_handle: string;
  avatar_uri: string;
  base_area: string;
  live: boolean;
  agreed: boolean;
  agreed_at: string | null;
  look_count: number;
  waiting: number;
  link_expires_at: string | null;
  claimed_at: string | null;
  /** A few of their newest covers, in the list only. */
  covers?: string[];
}
export interface FeaturedLook {
  id: string;
  photos: { uri: string; thumb_uri: string }[];
  styles: string[];
  hair_texture: string;
  caption: string;
}
export interface FeaturedDetail extends FeaturedSummary {
  bio: string;
  agreed_note: string;
  looks: FeaturedLook[];
}
export interface FeaturedList {
  items: FeaturedSummary[];
  count: number;
  page: number;
  pages: number;
}
