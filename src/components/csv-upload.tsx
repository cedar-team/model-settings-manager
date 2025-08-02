import React, { useRef, useState } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import { parseCSV, validateCSVColumns } from '@/utils/csv';
import { CSVUploadProps } from '@/types';

export const CSVUpload: React.FC<CSVUploadProps> = ({
  title,
  description,
  expectedColumns,
  onFileUpload,
  uploadedFile,
  onRemoveFile,
  onRefresh,
  canRefresh = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setError('');
    setIsProcessing(true);

    try {
      const text = await file.text();
      const data = parseCSV(text);

      if (data.length === 0) {
        setError('The CSV file appears to be empty or invalid');
        setIsProcessing(false);
        return;
      }

      if (!validateCSVColumns(data, expectedColumns)) {
        setError(`CSV must contain columns: ${expectedColumns.join(', ')}`);
        setIsProcessing(false);
        return;
      }

      onFileUpload(data, file.name);
      setIsProcessing(false);
    } catch (err) {
      setError('Failed to parse CSV file');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    setError('');
    onRemoveFile();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setError('');
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      setError('Failed to refresh data from Snowflake');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          {canRefresh && !uploadedFile && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? 'Refreshing...' : 'Refresh from Snowflake'}
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-2">
          <span className="text-xs text-muted-foreground">Expected columns: </span>
          <span className="text-xs font-mono">{expectedColumns.join(', ')}</span>
        </div>
        {canRefresh && (
          <div className="mt-1">
            <span className="text-xs text-muted-foreground">
              💡 Use the refresh button to automatically fetch data from Snowflake
            </span>
          </div>
        )}
      </div>

      {!uploadedFile ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            !isRefreshing && "cursor-pointer",
            isDragOver && !isRefreshing
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25",
            !isRefreshing && !isDragOver && "hover:border-primary/50 hover:bg-muted/25",
            error && "border-destructive bg-destructive/5",
            isRefreshing && "opacity-75"
          )}
          onDrop={!isRefreshing ? handleDrop : undefined}
          onDragOver={!isRefreshing ? handleDragOver : undefined}
          onDragLeave={!isRefreshing ? handleDragLeave : undefined}
          onClick={!isRefreshing ? handleClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            className="hidden"
          />
          
          <div className="space-y-2">
            <Upload className={cn(
              "h-8 w-8 mx-auto",
              error ? "text-destructive" : "text-muted-foreground"
            )} />
            <div>
              <p className="text-sm font-medium">
                {isProcessing 
                  ? 'Processing...' 
                  : isRefreshing 
                  ? 'Refreshing from Snowflake...'
                  : 'Drop CSV file here or click to browse'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {canRefresh ? 'CSV files only, or use refresh button above' : 'CSV files only'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{uploadedFile}</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  <span className="text-xs text-success">File uploaded successfully</span>
                </div>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};