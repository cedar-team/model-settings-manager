export interface ModelSetting {
  name: string;
  description: string;
  createdOn: string;
  team: string;
  inUse: boolean;
  source: 'master' | 'unused' | 'remaining' | 'snowflake';
}

export interface CSVUploadProps {
  title: string;
  description: string;
  expectedColumns: string[];
  onFileUpload: (data: any[], fileName: string) => void;
  uploadedFile: string;
  onRemoveFile: () => void;
  onRefresh?: () => Promise<void>;
  canRefresh?: boolean;
}

export interface DataTableProps {
  data: ModelSetting[];
}

export interface CSVRowData {
  [key: string]: string | undefined;
  Name?: string;
  Description?: string;
  'Created on'?: string;
  Team?: string;
}

export interface Stats {
  total: number;
  inUse: number;
  unused: number;
}

export interface Provider {
  id: string;
  name: string;
  businessUnitCount: number;
}

export interface ProviderModelSetting {
  settingName: string;
  providerName: string;
  providerId: string;
  defaultValue: string;
  overrideValue: string;
  percentEnabled: number;
  overrideType: 'provider' | 'business_unit' | 'user';
  businessUnitName: string;
  userName: string;
  userId: string;
  pod: string;
  overrideUpdatedOn: string;
  settingDescription: string;
}

export interface GroupedProviderModelSetting {
  settingName: string;
  description: string;
  overrides: ProviderModelSetting[];
}

export type SortField = keyof ModelSetting;
export type SortDirection = 'asc' | 'desc';