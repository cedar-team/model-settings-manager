import { CSVRowData } from '@/types';

// Test function to verify CSV escaping works correctly
export const testCSVEscaping = () => {
  const testData = [
    {
      'Simple Field': 'no special chars',
      'Field, with comma': 'value with, comma',
      'Field "with quotes"': 'value with "quotes" inside',
      'Field with\nnewline': 'value with\nnewline inside',
      'Field with spaces ': ' value with leading and trailing spaces ',
      'Empty Field': '',
      'Null Field': null,
      'Complex Field': 'value with, comma and "quotes" and\nnewlines'
    }
  ];
  
  console.log('Testing CSV escaping with complex data...');
  downloadCSV(testData, 'csv-escape-test.csv');
};

export const parseCSV = (csvText: string): CSVRowData[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(header => header.trim().replace(/"/g, ''));
  const data: CSVRowData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    // Skip completely empty lines
    if (values.length === 1 && values[0].trim() === '') {
      continue;
    }
    
    // Handle rows with different column counts more gracefully
    const row: CSVRowData = {};
    headers.forEach((header, index) => {
      // Use empty string for missing columns, or the value if it exists
      row[header] = (index < values.length) ? values[index] : '';
    });
    
    // Only add rows that have at least a name (first column)
    if (row[headers[0]] && row[headers[0]].trim() !== '') {
      data.push(row);
    }
  }

  return data;
};

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quotes
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
};

export const validateCSVColumns = (data: CSVRowData[], expectedColumns: string[]): boolean => {
  if (data.length === 0) return false;
  
  const firstRow = data[0];
  return expectedColumns.every(col => col in firstRow);
};

// Helper function to properly escape CSV field values
const escapeCSVField = (value: any): string => {
  // Convert to string and handle null/undefined
  const stringValue = value == null ? '' : String(value);
  
  // Check if the field needs to be wrapped in quotes
  // Fields with commas, quotes, newlines, or leading/trailing whitespace must be quoted
  const needsQuoting = stringValue.includes(',') || 
                      stringValue.includes('"') || 
                      stringValue.includes('\n') || 
                      stringValue.includes('\r') || 
                      stringValue.startsWith(' ') || 
                      stringValue.endsWith(' ');
  
  if (needsQuoting) {
    // Escape quotes by doubling them and wrap the whole field in quotes
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

export const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  
  // Create CSV content with properly escaped headers and data
  const csvContent = [
    // Escape headers too
    headers.map(header => escapeCSVField(header)).join(','),
    // Escape all data fields
    ...data.map(row => 
      headers.map(header => escapeCSVField(row[header])).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};