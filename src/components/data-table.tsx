import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, ExternalLink, ChevronDown, ChevronUp, Settings, Building2, User, Shield } from 'lucide-react';
import { cn } from '@/utils/cn';
import { downloadCSV } from '@/utils/csv';
import { DataTableProps, ModelSetting, SortField, SortDirection } from '@/types';
import { apiService } from '@/services/api';

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
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
          <div className="w-1.5 h-1.5 bg-success rounded-full" />
          In Use
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20">
        <div className="w-1.5 h-1.5 bg-warning rounded-full" />
        Unused
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Model Settings Data</h2>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
            {data.length} total records
          </span>
        </div>
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
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Showing {filteredAndSortedData.length} of {data.length} model settings
        </span>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
          💡 Tip: Scroll horizontally to see all columns
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div 
          className="overflow-x-auto relative"
          onScroll={(e) => {
            const element = e.currentTarget;
            const leftIndicator = element.querySelector('#scroll-left-indicator') as HTMLElement;
            const rightIndicator = element.querySelector('#scroll-right-indicator') as HTMLElement;
            
            if (leftIndicator && rightIndicator) {
              // Show left indicator if scrolled right
              leftIndicator.style.opacity = element.scrollLeft > 0 ? '1' : '0';
              // Show right indicator if not at the end
              rightIndicator.style.opacity = 
                element.scrollLeft < (element.scrollWidth - element.clientWidth) ? '1' : '0';
            }
          }}
        >
          {/* Gradient fade indicators for horizontal scroll */}
          <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none opacity-0 transition-opacity" id="scroll-left-indicator"></div>
          <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none opacity-100 transition-opacity" id="scroll-right-indicator"></div>
          
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/50 sticky top-0 z-20">
              <tr>
                <th className="text-left p-4 w-[200px] min-w-[200px]">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                  >
                    Name
                    {getSortIcon('name')}
                  </button>
                </th>
                <th className="text-left p-4 w-[300px] min-w-[250px]">
                  <button
                    onClick={() => handleSort('description')}
                    className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                  >
                    Description
                    {getSortIcon('description')}
                  </button>
                </th>
                <th className="text-left p-4 w-[150px] min-w-[120px]">
                  <button
                    onClick={() => handleSort('team')}
                    className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                  >
                    Team
                    {getSortIcon('team')}
                  </button>
                </th>
                <th className="text-left p-4 w-[120px] min-w-[100px]">
                  <button
                    onClick={() => handleSort('createdOn')}
                    className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                  >
                    Created On
                    {getSortIcon('createdOn')}
                  </button>
                </th>
                <th className="text-left p-4 w-[100px] min-w-[80px]">
                  <span className="font-medium">Status</span>
                </th>
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
                  <td className="p-4 w-[200px]">
                    <div className="font-medium flex items-center gap-2 truncate">
                      <span className="truncate" title={item.name}>{item.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </td>
                  <td className="p-4 w-[300px]">
                    <ExpandableText 
                      text={item.description} 
                      maxLength={120}
                      className="max-w-[280px]"
                    />
                  </td>
                  <td className="p-4 w-[150px]">
                    <div className="text-sm truncate" title={item.team}>{item.team}</div>
                  </td>
                  <td className="p-4 w-[120px]">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">{item.createdOn}</div>
                  </td>
                  <td className="p-4 w-[100px]">
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
        
        const data = await apiService.getModelSettingDetails(setting.name, true); // Use cache
        setDetailData(data);
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
        return (typeOrder[a.recordType as keyof typeof typeOrder] || 99) - (typeOrder[b.recordType as keyof typeof typeOrder] || 99);
      });
    });
    
    return groups;
  }, [detailData]);

  // Helper function to get the appropriate badge for record types
  const getRecordTypeBadge = (recordType: string) => {
    switch (recordType) {
      case 'default':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Settings className="h-3 w-3" />
            Default
          </span>
        );
      case 'provider_override':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-success/10 text-success border border-success/20">
            <Shield className="h-3 w-3" />
            Provider
          </span>
        );
      case 'business_unit_override':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-700 border border-purple-500/20">
            <Building2 className="h-3 w-3" />
            Business Unit
          </span>
        );
      case 'user_override':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20">
            <User className="h-3 w-3" />
            User
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground border border-border">
            <Settings className="h-3 w-3" />
            Override
          </span>
        );
    }
  };

  // Helper function to get row styling based on record type
  const getRowStyling = (recordType: string) => {
    switch (recordType) {
      case 'default':
        return 'border-b bg-primary/5 hover:bg-primary/10 transition-colors';
      case 'provider_override':
        return 'border-b bg-success/5 hover:bg-success/10 transition-colors';
      case 'business_unit_override':
        return 'border-b bg-purple-500/5 hover:bg-purple-500/10 transition-colors';
      case 'user_override':
        return 'border-b bg-warning/5 hover:bg-warning/10 transition-colors';
      default:
        return 'border-b hover:bg-muted/50 transition-colors';
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
                    <h4 className="font-semibold text-base">Pod: <span className="font-mono text-primary">{pod}</span></h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{defaults.length} default value(s)</span>
                      <span>{overrides.length} override(s)</span>
                      {overrides.length > 0 && (
                        <div className="flex items-center gap-2">
                          {overrides.filter(o => o.recordType === 'provider_override').length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-success/10 text-success rounded">
                              <Shield className="h-3 w-3" />
                              {overrides.filter(o => o.recordType === 'provider_override').length}
                            </span>
                          )}
                          {overrides.filter(o => o.recordType === 'business_unit_override').length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-500/10 text-purple-700 rounded">
                              <Building2 className="h-3 w-3" />
                              {overrides.filter(o => o.recordType === 'business_unit_override').length}
                            </span>
                          )}
                          {overrides.filter(o => o.recordType === 'user_override').length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-warning/10 text-warning rounded">
                              <User className="h-3 w-3" />
                              {overrides.filter(o => o.recordType === 'user_override').length}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/10">
                        <tr>
                          <th className="text-left p-3 border-b font-medium text-xs uppercase tracking-wide text-muted-foreground">Type</th>
                          <th className="text-left p-3 border-b font-medium text-xs uppercase tracking-wide text-muted-foreground">Provider</th>
                          <th className="text-left p-3 border-b font-medium text-xs uppercase tracking-wide text-muted-foreground">Business Unit</th>
                          <th className="text-left p-3 border-b font-medium text-xs uppercase tracking-wide text-muted-foreground">Value</th>
                          <th className="text-left p-3 border-b font-medium text-xs uppercase tracking-wide text-muted-foreground">Percent</th>
                          <th className="text-left p-3 border-b font-medium text-xs uppercase tracking-wide text-muted-foreground">Updated</th>
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