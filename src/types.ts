export interface CodeQLConfig {
  paths?: string[];
  'paths-ignore'?: string[];
  'query-filters'?: QueryFilter[];
  languages?: string;
  packs?: string[];
}

export interface QueryFilter {
  exclude?: {
    id?: string;
  };
}

export interface FilterOptions {
  config?: CodeQLConfig | undefined;
}

export interface CodeQLResult {
  ruleId: string;
  message: {
    text: string;
  };
  partialFingerprints?: Record<string, string>;
  locations?: Array<{
    physicalLocation: {
      artifactLocation: {
        uri: string;
      };
      region: {
        startLine: number;
      };
    };
    message?: {
      text: string;
    };
  }>;
}

export interface SarifRun {
  results?: CodeQLResult[];
}

export interface SarifReport {
  runs?: SarifRun[];
}

export interface IssueData {
  title: string;
  body: string;
  labels: string[];
}

export interface QueryPack {
  language: string;
  profile: string;
  pack: string;
}

export interface AnalysisInputs {
  languages: string;
  sourceRoot?: string;
  ram?: string;
  threads?: string;
  debug: boolean;
  config?: string;
  configFile?: string;
  qlsProfile: string;
  token: string;
}
