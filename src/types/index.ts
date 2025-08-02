export interface ModelSetting {
  name: string;
  description: string;
  createdOn: string;
  team: string;
  inUse: boolean;
  deleted: boolean;
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
  deleted: number;
}

export type SortField = keyof ModelSetting;
export type SortDirection = 'asc' | 'desc';