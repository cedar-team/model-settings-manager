import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { downloadCSV } from '@/utils/csv';
import { DataTableProps, ModelSetting, SortField, SortDirection } from '@/types';

export type { ModelSetting };

// Expandable text component for long descriptions and values
interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ 
  text, 
  maxLength = 100, 
  className = "" 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text.length <= maxLength) {
    return <span className={className}>{text}</span>;
  }
  
  const truncated = text.slice(0, maxLength);
  
  return (
    <div className={className}>
      <span>
        {isExpanded ? text : `${truncated}...`}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent row click when expanding text
          setIsExpanded(!isExpanded);
        }}
        className="ml-2 text-primary hover:text-primary/80 text-xs font-medium inline-flex items-center gap-1 transition-colors"
      >
        {isExpanded ? (
          <>
            Show less
            <ChevronUp className="h-3 w-3" />
          </>
        ) : (
          <>
            Show more
            <ChevronDown className="h-3 w-3" />
          </>
        )}
      </button>
    </div>
  );
};

export const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-use' | 'unused'>('all');
  const [selectedSetting, setSelectedSetting] = useState<ModelSetting | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.team.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'in-use' && item.inUse) ||
        (statusFilter === 'unused' && !item.inUse)

      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      let comparison = 0;
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        comparison = aValue === bValue ? 0 : aValue ? 1 : -1;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [data, searchTerm, sortField, sortDirection, statusFilter]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRowClick = (setting: ModelSetting) => {
    setSelectedSetting(setting);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedSetting(null);
  };

  const handleExport = () => {
    const exportData = filteredAndSortedData.map(item => ({
      Name: item.name,
      Description: item.description,
      'Created On': item.createdOn,
      Team: item.team,
      'In Use': item.inUse ? 'Yes' : 'No',
      Status: item.inUse ? 'In Use' : 'Unused'
    }));
    downloadCSV(exportData, 'model-settings-export.csv');
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const getStatusBadge = (item: ModelSetting) => {
    if (item.inUse) {
      return <span className="px-2 py-1 text-xs rounded-full bg-success/10 text-success">In Use</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-warning/10 text-warning">Unused</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Model Settings Data</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, description, or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="in-use">In Use</option>
            <option value="unused">Unused</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredAndSortedData.length} of {data.length} model settings
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Name
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('description')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Description
                    {getSortIcon('description')}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('team')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Team
                    {getSortIcon('team')}
                  </button>
                </th>
                <th className="text-left p-4">
                  <button
                    onClick={() => handleSort('createdOn')}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    Created On
                    {getSortIcon('createdOn')}
                  </button>
                </th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((item, index) => (
                <tr 
                  key={`${item.name}-${index}`} 
                  onClick={() => handleRowClick(item)}
                  className={cn(
                    "border-t hover:bg-muted/25 transition-colors cursor-pointer group",
                  )}
                >
                  <td className="p-4">
                    <div className="font-medium flex items-center gap-2">
                      {item.name}
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </td>
                  <td className="p-4">
                    <ExpandableText 
                      text={item.description} 
                      maxLength={80}
                      className="max-w-xs"
                    />
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{item.team}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-muted-foreground">{item.createdOn}</div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAndSortedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No model settings found matching your criteria.
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedSetting && (
        <ModelSettingDetailModal 
          setting={selectedSetting} 
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};

// Modal component for showing detailed model setting information
interface ModelSettingDetailModalProps {
  setting: ModelSetting;
  onClose: () => void;
}

const ModelSettingDetailModal: React.FC<ModelSettingDetailModalProps> = ({ setting, onClose }) => {
  const [detailData, setDetailData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Load detailed data when modal opens
  React.useEffect(() => {
    const loadDetails = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`http://localhost:3001/api/model-settings/${encodeURIComponent(setting.name)}/details`);
        const result = await response.json();
        
        if (result.success) {
          setDetailData(result.data);
        } else {
          setError(result.error || 'Failed to load details');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load details');
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [setting.name]);

  // Group data by pod for better organization, separating defaults from different override types
  const groupedData = useMemo(() => {
    const groups: Record<string, { defaults: any[], overrides: any[] }> = {};
    detailData.forEach(item => {
      const pod = item.pod || 'Unknown';
      if (!groups[pod]) groups[pod] = { defaults: [], overrides: [] };
      
      if (item.recordType === 'default') {
        groups[pod].defaults.push(item);
      } else {
        groups[pod].overrides.push(item);
      }
    });
    
    // Sort overrides by type for consistent display
    Object.values(groups).forEach(group => {
      group.overrides.sort((a, b) => {
        const typeOrder = {
          'provider_override': 1,
          'business_unit_override': 2, 
          'user_override': 3,
          'override': 4
        };
        return (typeOrder[a.recordType] || 99) - (typeOrder[b.recordType] || 99);
      });
    });
    
    return groups;
  }, [detailData]);

  // Helper function to get the appropriate badge for record types
  const getRecordTypeBadge = (recordType: string) => {
    switch (recordType) {
      case 'default':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Default
          </span>
        );
      case 'provider_override':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Provider
          </span>
        );
      case 'business_unit_override':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Business Unit
          </span>
        );
      case 'user_override':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            User
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Override
          </span>
        );
    }
  };

  // Helper function to get row styling based on record type
  const getRowStyling = (recordType: string) => {
    switch (recordType) {
      case 'default':
        return 'border-b bg-blue-50/50';
      case 'provider_override':
        return 'border-b bg-green-50/30';
      case 'business_unit_override':
        return 'border-b bg-purple-50/30';
      case 'user_override':
        return 'border-b bg-orange-50/30';
      default:
        return 'border-b';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{setting.name}</h2>
              <p className="text-muted-foreground mt-1">Model Setting Details</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              <p className="font-medium">Error loading details:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              {/* Overview */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Team:</span>
                    <div className="font-medium">{setting.team}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="font-medium">{setting.inUse ? 'In Use' : 'Unused'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Configurations:</span>
                    <div className="font-medium">{detailData.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created On:</span>
                    <div className="font-medium">{setting.createdOn}</div>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">Description:</span>
                    <div className="font-medium">
                      <ExpandableText 
                        text={setting.description || 'No description available'} 
                        maxLength={200}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pod-organized details */}
              {Object.entries(groupedData).map(([pod, { defaults, overrides }]) => (
                <div key={pod} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/20 px-4 py-3 border-b">
                    <h4 className="font-semibold">Pod: {pod}</h4>
                    <p className="text-sm text-muted-foreground">
                      {defaults.length} default value(s), {overrides.length} override(s)
                      {overrides.length > 0 && (
                        <span className="ml-2">
                          ({[
                            overrides.filter(o => o.recordType === 'provider_override').length > 0 && 
                              `${overrides.filter(o => o.recordType === 'provider_override').length} provider`,
                            overrides.filter(o => o.recordType === 'business_unit_override').length > 0 && 
                              `${overrides.filter(o => o.recordType === 'business_unit_override').length} business unit`,
                            overrides.filter(o => o.recordType === 'user_override').length > 0 && 
                              `${overrides.filter(o => o.recordType === 'user_override').length} user`
                          ].filter(Boolean).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/10">
                        <tr>
                          <th className="text-left p-3 border-b">Type</th>
                          <th className="text-left p-3 border-b">Provider</th>
                          <th className="text-left p-3 border-b">Business Unit</th>
                          <th className="text-left p-3 border-b">Value</th>
                          <th className="text-left p-3 border-b">Percent</th>
                          <th className="text-left p-3 border-b">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Show default values first */}
                        {defaults.map((item, index) => (
                          <tr key={`default-${index}`} className={getRowStyling(item.recordType)}>
                            <td className="p-3">
                              {getRecordTypeBadge(item.recordType)}
                            </td>
                            <td className="p-3 font-medium">{item.providerName}</td>
                            <td className="p-3">{item.businessUnitName || '—'}</td>
                            <td className="p-3">
                              <ExpandableText 
                                text={item.specificValue || item.defaultValue || '—'} 
                                maxLength={150}
                                className="max-w-sm"
                              />
                            </td>
                            <td className="p-3">{item.percentEnabled || '—'}%</td>
                            <td className="p-3 text-muted-foreground">
                              {item.valueUpdatedOn ? new Date(item.valueUpdatedOn).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Show overrides below defaults */}
                        {overrides.map((item, index) => (
                          <tr key={`override-${index}`} className={getRowStyling(item.recordType)}>
                            <td className="p-3">
                              {getRecordTypeBadge(item.recordType)}
                            </td>
                            <td className="p-3">{item.providerName || 'Unknown'}</td>
                            <td className="p-3">{item.businessUnitName || '—'}</td>
                            <td className="p-3">
                              <ExpandableText 
                                text={item.specificValue || item.defaultValue || '—'} 
                                maxLength={150}
                                className="max-w-sm"
                              />
                            </td>
                            <td className="p-3">{item.percentEnabled || '—'}%</td>
                            <td className="p-3 text-muted-foreground">
                              {item.valueUpdatedOn ? new Date(item.valueUpdatedOn).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              {detailData.length === 0 && !loading && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  No detailed configuration data found for this setting.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};