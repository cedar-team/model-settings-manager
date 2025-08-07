import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, ExternalLink, ChevronDown, ChevronUp, Settings, Building2, User, Shield } from 'lucide-react';
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
  const [nameSearch, setNameSearch] = useState('');
  const [descriptionSearch, setDescriptionSearch] = useState('');
  const [createdOnSearch, setCreatedOnSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-use' | 'unused'>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [selectedSetting, setSelectedSetting] = useState<ModelSetting | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Get unique teams for the filter dropdown
  const uniqueTeams = useMemo(() => {
    const teams = [...new Set(data.map(item => item.team).filter(Boolean))];
    return teams.sort();
  }, [data]);



  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item => {
      const matchesName = nameSearch === '' || 
        item.name.toLowerCase().includes(nameSearch.toLowerCase());
      
      const matchesDescription = descriptionSearch === '' || 
        item.description.toLowerCase().includes(descriptionSearch.toLowerCase());
      
      const matchesCreatedOn = createdOnSearch === '' || 
        item.createdOn.toLowerCase().includes(createdOnSearch.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'in-use' && item.inUse) ||
        (statusFilter === 'unused' && !item.inUse);

      const matchesTeam = 
        teamFilter === 'all' || 
        item.team === teamFilter;

      return matchesName && matchesDescription && matchesCreatedOn && matchesStatus && matchesTeam;
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
  }, [data, nameSearch, descriptionSearch, createdOnSearch, sortField, sortDirection, statusFilter, teamFilter]);

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
        <div className="flex items-center gap-2">
          {(nameSearch || descriptionSearch || createdOnSearch || teamFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setNameSearch('');
                setDescriptionSearch('');
                setCreatedOnSearch('');
                setTeamFilter('all');
                setStatusFilter('all');
              }}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Clear All Filters
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>



      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">
            Showing {filteredAndSortedData.length} of {data.length} model settings
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="w-full">
          <table className="w-full table-fixed">
            <thead className="bg-muted/50 sticky top-0 z-20">
              <tr>
                <th className="text-left p-3 w-[25%]">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                    >
                      Name
                      {getSortIcon('name')}
                    </button>
                    <input
                      type="text"
                      placeholder="Search names..."
                      value={nameSearch}
                      onChange={(e) => setNameSearch(e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
                <th className="text-left p-3 w-[35%]">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSort('description')}
                      className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                    >
                      Description
                      {getSortIcon('description')}
                    </button>
                    <input
                      type="text"
                      placeholder="Search descriptions..."
                      value={descriptionSearch}
                      onChange={(e) => setDescriptionSearch(e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
                <th className="text-left p-3 w-[15%]">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSort('team')}
                      className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                    >
                      Team
                      {getSortIcon('team')}
                    </button>
                    <select
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="all">All Teams</option>
                      {uniqueTeams.map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th className="text-left p-3 w-[15%]">
                  <div className="space-y-2">
                    <button
                      onClick={() => handleSort('createdOn')}
                      className="flex items-center gap-2 hover:text-primary transition-colors font-medium"
                    >
                      Created On
                      {getSortIcon('createdOn')}
                    </button>
                    <input
                      type="text"
                      placeholder="Search dates..."
                      value={createdOnSearch}
                      onChange={(e) => setCreatedOnSearch(e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </th>
                <th className="text-left p-3 w-[10%]">
                  <div className="space-y-2">
                    <span className="font-medium">Status</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="w-full px-2 py-1 text-xs border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="all">All</option>
                      <option value="in-use">In Use</option>
                      <option value="unused">Unused</option>
                    </select>
                  </div>
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
                  <td className="p-3 w-[25%]">
                    <div className="font-medium flex items-center gap-2 overflow-hidden">
                      <span className="truncate" title={item.name}>{item.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>
                  </td>
                  <td className="p-3 w-[35%]">
                    <ExpandableText 
                      text={item.description} 
                      maxLength={80}
                      className="text-sm"
                    />
                  </td>
                  <td className="p-3 w-[15%]">
                    <div className="text-sm truncate" title={item.team}>{item.team}</div>
                  </td>
                  <td className="p-3 w-[15%]">
                    <div className="text-sm text-muted-foreground truncate">{item.createdOn}</div>
                  </td>
                  <td className="p-3 w-[10%]">
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

  // Group data by pod for better organization, separating defaults, overrides, and not_present
  const groupedData = useMemo(() => {
    const groups: Record<string, { defaults: any[], overrides: any[], notPresent: any[] }> = {};
    detailData.forEach(item => {
      const pod = item.pod || 'Unknown';
      if (!groups[pod]) groups[pod] = { defaults: [], overrides: [], notPresent: [] };
      
      if (item.recordType === 'default') {
        groups[pod].defaults.push(item);
      } else if (item.recordType === 'not_present') {
        groups[pod].notPresent.push(item);
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
      case 'not_present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            Not Present
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
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
                    <span className="text-muted-foreground">Value Conditionals:</span>
                    <div className="font-medium">
                      {detailData.some(item => item.conditional) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {detailData.filter(item => item.conditional).length}
                        </span>
                      ) : 'None'}
                    </div>
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
                  
                  {/* Conditional Schema - shown once at model setting level */}
                  {detailData.some(item => item.conditionalSchema) && (
                    <div className="md:col-span-3">
                      <span className="text-muted-foreground">Conditional Schema:</span>
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            JSON Schema
                          </span>
                          <span className="text-xs text-muted-foreground">Applied to all values</span>
                        </div>
                        <div className="text-sm font-mono bg-white p-2 rounded border">
                          <ExpandableText 
                            text={detailData.find(item => item.conditionalSchema)?.conditionalSchema || ''} 
                            maxLength={300}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pod-organized details */}
              {Object.entries(groupedData).map(([pod, { defaults, overrides, notPresent }]) => (
                <div key={pod} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/20 px-4 py-3 border-b">
                    <h4 className="font-semibold text-base">Pod: <span className="font-mono text-primary">{pod}</span></h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {notPresent.length > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded border border-red-200 font-medium">
                          <span className="h-2 w-2 rounded-full bg-red-400" />
                          Setting Not Present
                        </span>
                      ) : (
                        <>
                          <span>{defaults.length} default value(s)</span>
                          <span>{overrides.length} override(s)</span>
                          {[...defaults, ...overrides].some(item => item.conditional) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                              Conditionals
                            </span>
                          )}
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
                        </>
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
                              <div className="space-y-1">
                                <ExpandableText 
                                  text={item.specificValue || item.defaultValue || '—'} 
                                  maxLength={150}
                                  className="max-w-sm"
                                />
                                
                                {/* Conditional (from model setting value) */}
                                {item.conditional && (
                                  <div className="text-xs">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                                      Conditional
                                    </span>
                                    <div className="mt-1 text-muted-foreground">
                                      <ExpandableText 
                                        text={item.conditional} 
                                        maxLength={100}
                                        className="text-xs"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
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
                              <div className="space-y-1">
                                <ExpandableText 
                                  text={item.specificValue || item.defaultValue || '—'} 
                                  maxLength={150}
                                  className="max-w-sm"
                                />
                                
                                {/* Conditional (from model setting value) */}
                                {item.conditional && (
                                  <div className="text-xs">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">
                                      Conditional
                                    </span>
                                    <div className="mt-1 text-muted-foreground">
                                      <ExpandableText 
                                        text={item.conditional} 
                                        maxLength={100}
                                        className="text-xs"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">{item.percentEnabled || '—'}%</td>
                            <td className="p-3 text-muted-foreground">
                              {item.valueUpdatedOn ? new Date(item.valueUpdatedOn).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                        
                        {/* Show not present status */}
                        {notPresent.map((item, index) => (
                          <tr key={`not-present-${index}`} className="bg-red-50/50">
                            <td className="p-3">
                              {getRecordTypeBadge(item.recordType)}
                            </td>
                            <td className="p-3 text-muted-foreground italic">{item.providerName}</td>
                            <td className="p-3 text-muted-foreground">—</td>
                            <td className="p-3 text-muted-foreground italic">
                              This model setting is not configured for this pod
                            </td>
                            <td className="p-3 text-muted-foreground">—</td>
                            <td className="p-3 text-muted-foreground">—</td>
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