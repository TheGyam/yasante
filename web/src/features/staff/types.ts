export interface Resource {
  key: string;
  name: string;
  group: string;
  url: string;
  addUrl: string | null;
  canView: boolean;
}

export interface Overview {
  user: { name: string; superuser: boolean };
  csrfToken: string;
  models: Resource[];
  metrics: { label: string; hint: string; value: number; url: string }[];
  queues: { label: string; hint: string; count: number; url: string }[];
  audit: {
    id: number;
    object: string;
    actor: string;
    action: string;
    at: string;
    url: string | null;
  }[];
  trend: { dates: string[]; series: { label: string; values: number[] }[] };
  generatedAt: string;
}

export interface Records {
  quickEditable?: boolean;
  name: string;
  columns: { key: string; label: string; sort: number | null; direction: 'asc' | 'desc' | null }[];
  rows: { id: string; values: string[]; url: string }[];
  count: number;
  page: number;
  pages: number;
  searchable: boolean;
  filters: { label: string; choices: { label: string; selected: boolean; query: string }[] }[];
  actions: { key: string; label: string }[];
  addUrl: string | null;
}

export interface Field {
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
