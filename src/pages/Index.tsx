import { useState, useEffect } from 'react';
import { DataTable } from '@/components/data-table';
import { Tooltip } from '@/components/tooltip';
import { Database, RefreshCw, BarChart3, Zap, Copy, Check, Building, Settings, Search, ChevronDown, ChevronUp, Expand, Minimize } from 'lucide-react';
import { apiService } from '@/services/api';
import { cacheService } from '@/services/cache';
import { ModelSetting, Provider, ProviderModelSetting, GroupedProviderModelSetting } from '@/types';

const Index = () => {
  const [modelSettings, setModelSettings] = useState<ModelSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingTeamMapping, setRefreshingTeamMapping] = useState(false);
  const [snowflakeAvailable, setSnowflakeAvailable] = useState<boolean | null>(null);
  const [checkingSnowflake, setCheckingSnowflake] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'providers'>('overview');
  
  // Provider tab state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [groupedProviderSettings, setGroupedProviderSettings] = useState<GroupedProviderModelSetting[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [loadingProviderSettings, setLoadingProviderSettings] = useState(false);
  const [providerError, setProviderError] = useState<string>('');
  const [providerSearchTerm, setProviderSearchTerm] = useState<string>('');
  const [expandedValues, setExpandedValues] = useState<Set<string>>(new Set());
  const [expandedSettings, setExpandedSettings] = useState<Set<string>>(new Set());

  const PR_TEMPLATE = `### Rationale
This model setting is no longer in use.


### Solution
This removes it.


### Test Plan
#### List the steps to view your change locally, if possible.
N/A (nothing should change)

#### If you did not add automated tests, explain why.
N/A (nothing should change)

#### How will you confirm this works after it has been deployed?
Ensure no alerts are thrown.

### Security Impact
Please answer the questions below about your PR.
If yes, please explain and add \`cedar-team/security\` as reviewers.
#### Does this involve authentication, permissions, secrets or encryption?
No
#### Will this change allow humans to enter data into Cedar?
No
#### Will this change collect a new type of data? For example, introducing the collection of driver's licenses when we didn't collect them before, etc.
No
#### Does this PR add new vendors or add/update (python, JS, etc.) libraries?
No
#### Are there any security questions?
No

### Additional Reviewers
N/A`;

  const copyPRTemplate = async () => {
    try {
      await navigator.clipboard.writeText(PR_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const loadModelSettings = async () => {
    try {
      setError('');
      const data = await apiService.getAllModelSettings(true); // Use cache
      console.log('Loaded model settings:', data);
      // Transform API data to UI format
      const transformedData: ModelSetting[] = data.map(setting => ({
        name: setting.name,
        description: setting.description,
        createdOn: setting.created_date,
        team: setting.team, // Now available from the API
        inUse: setting.inUse,
        source: 'snowflake' as const
      }));
      setModelSettings(transformedData);
    } catch (err) {
      console.error('Failed to load model settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load model settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError('');
      const data = await apiService.refreshModelSettings(); // This clears cache automatically
      console.log('Refreshed model settings:', data);
      // Transform API data to UI format
      const transformedData: ModelSetting[] = data.map(setting => ({
        name: setting.name,
        description: setting.description,
        createdOn: setting.created_date,
        team: setting.team, // Now available from the API
        inUse: setting.inUse,
        source: 'snowflake' as const
      }));
      setModelSettings(transformedData);
    } catch (err) {
      console.error('Failed to refresh model settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh model settings');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshTeamMapping = async () => {
    try {
      setRefreshingTeamMapping(true);
      setError('');
      const response = await apiService.refreshTeamMapping();
      console.log('Refreshed team mapping:', response);
      
      // After refreshing team mapping, reload the model settings to get updated team info
      const data = await apiService.getAllModelSettings(false); // Force fresh data since teams changed
      const transformedData: ModelSetting[] = data.map(setting => ({
        name: setting.name,
        description: setting.description,
        createdOn: setting.created_date,
        team: setting.team,
        inUse: setting.inUse,
        source: 'snowflake' as const
      }));
      setModelSettings(transformedData);
    } catch (err) {
      console.error('Failed to refresh team mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh team mapping');
    } finally {
      setRefreshingTeamMapping(false);
    }
  };

  const checkSnowflakeAvailability = async () => {
    try {
      setCheckingSnowflake(true);
      const status = await apiService.checkSnowflakeStatus();
      setSnowflakeAvailable(status.snowflakeCliAvailable);
    } catch (err) {
      console.error('Failed to check Snowflake status:', err);
      setSnowflakeAvailable(false);
    } finally {
      setCheckingSnowflake(false);
    }
  };

  const loadProviders = async () => {
    try {
      setLoadingProviders(true);
      setProviderError('');
      const data = await apiService.getAllProviders(true);
      console.log('Loaded providers:', data);
      setProviders(data);
    } catch (err) {
      console.error('Failed to load providers:', err);
      setProviderError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoadingProviders(false);
    }
  };

  const loadProviderSettings = async (providerId: string) => {
    try {
      setLoadingProviderSettings(true);
      setProviderError('');
      const data = await apiService.getProviderModelSettings(providerId, true);
      console.log('Loaded provider settings:', data);
      
      // Group by setting name
      const grouped = data.reduce((acc: GroupedProviderModelSetting[], setting: ProviderModelSetting) => {
        const existingGroup = acc.find(group => group.settingName === setting.settingName);
        if (existingGroup) {
          existingGroup.overrides.push(setting);
        } else {
          acc.push({
            settingName: setting.settingName,
            description: setting.settingDescription,
            overrides: [setting]
          });
        }
        return acc;
      }, []);
      
      setGroupedProviderSettings(grouped);
    } catch (err) {
      console.error('Failed to load provider settings:', err);
      setProviderError(err instanceof Error ? err.message : 'Failed to load provider settings');
    } finally {
      setLoadingProviderSettings(false);
    }
  };

  const handleProviderSelect = async (provider: Provider) => {
    setSelectedProvider(provider);
    await loadProviderSettings(provider.id);
  };

  const toggleValueExpansion = (valueId: string) => {
    const newExpanded = new Set(expandedValues);
    if (newExpanded.has(valueId)) {
      newExpanded.delete(valueId);
    } else {
      newExpanded.add(valueId);
    }
    setExpandedValues(newExpanded);
  };

  const truncateValue = (value: string, maxLength: number = 50) => {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  };

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(providerSearchTerm.toLowerCase())
  );

  const toggleSettingExpansion = (settingName: string) => {
    const newExpanded = new Set(expandedSettings);
    if (newExpanded.has(settingName)) {
      newExpanded.delete(settingName);
    } else {
      newExpanded.add(settingName);
    }
    setExpandedSettings(newExpanded);
  };

  const expandAllSettings = () => {
    const allSettingNames = new Set(groupedProviderSettings.map(group => group.settingName));
    setExpandedSettings(allSettingNames);
  };

  const collapseAllSettings = () => {
    setExpandedSettings(new Set());
  };

  useEffect(() => {
    const initializeApp = async () => {
      await checkSnowflakeAvailability();
      if (snowflakeAvailable !== false) {
        await loadModelSettings();
        await loadProviders();
      }
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (snowflakeAvailable === true && modelSettings.length === 0 && !loading) {
      loadModelSettings();
      loadProviders();
    }
  }, [snowflakeAvailable]);

  const stats = {
    total: modelSettings.length,
    inUse: modelSettings.filter(item => item.inUse).length,
    unused: modelSettings.filter(item => !item.inUse).length,
    missingDescriptions: modelSettings.filter(item => !item.description || item.description.trim() === '').length,
  };



  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-card to-muted/30">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Database className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold">Model Settings Manager</h1>
              </div>
              <p className="text-muted-foreground">
                Analyze model settings data directly from Snowflake
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Tooltip content="Feel free to use this template in your GitHub PR if you're removing a model setting!">
                <button
                  onClick={copyPRTemplate}
                  className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy removal PR template
                    </>
                  )}
                </button>
              </Tooltip>
              {snowflakeAvailable === true && (
                <>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || refreshingTeamMapping}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                  </button>
                  <Tooltip content="Refreshes team mappings from CODE_OWNERSHIP.yml in your local filesystem. Make sure you're on the master branch in the cedar repo for the most up-to-date team assignments.">
                    <button
                      onClick={handleRefreshTeamMapping}
                      disabled={refreshing || refreshingTeamMapping}
                      className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshingTeamMapping ? 'animate-spin' : ''}`} />
                      {refreshingTeamMapping ? 'Updating Teams...' : 'Refresh Teams'}
                    </button>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Global Error Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading model settings:</p>
            <p className="text-sm">{error}</p>
            <p className="text-sm">Are you connected to Tailscale?</p>
          </div>
        )}

        {providerError && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading provider data:</p>
            <p className="text-sm">{providerError}</p>
          </div>
        )}

        {/* Snowflake CLI Check Loading */}
        {checkingSnowflake && (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Checking Snowflake CLI availability...</p>
          </div>
        )}

        {/* Snowflake Not Available */}
        {!checkingSnowflake && snowflakeAvailable === false && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <Database className="h-16 w-16 mx-auto mb-4 text-destructive" />
              <h3 className="text-lg font-semibold mb-2 text-destructive">Snowflake CLI Not Available</h3>
              <p className="text-muted-foreground mb-4">
                The Snowflake CLI is not installed or not accessible. Please install the Snowflake CLI to use this application.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-left">
                <p className="text-sm font-medium mb-2">To install Snowflake CLI run:</p>
                <code className="text-sm bg-muted/50 rounded-lg p-2 block">brew install snowflake-cli</code>
              </div>
              <button
                onClick={checkSnowflakeAvailability}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mx-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Check
              </button>
            </div>
          </div>
        )}

        {/* Main Content - only show when Snowflake is available */}
        {!checkingSnowflake && snowflakeAvailable === true && (
          <>
            {/* Tab Navigation */}
            <div className="border-b border-border">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'overview'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Overview
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('providers')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'providers'
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  } transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Providers
                  </div>
                </button>
              </nav>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                {/* Loading Model Settings */}
                {loading && (
                  <div className="text-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading model settings from Snowflake...</p>
                  </div>
                )}

                {/* Stats Section */}
                {!loading && modelSettings.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-6">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <h2 className="text-xl font-semibold">Overview</h2>
                      {cacheService.has('model_settings') && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                          <Zap className="h-3 w-3" />
                          Cached data
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                      <div className="bg-card rounded-lg p-6 border shadow-sm">
                        <div className="text-2xl font-bold text-primary">{stats.total}</div>
                        <div className="text-sm text-muted-foreground">Total Model Settings</div>
                      </div>
                      <div className="bg-card rounded-lg p-6 border shadow-sm">
                        <div className="text-2xl font-bold text-success">{stats.inUse}</div>
                        <div className="text-sm text-muted-foreground">In Use</div>
                      </div>
                      <div className="bg-card rounded-lg p-6 border shadow-sm">
                        <div className="text-2xl font-bold text-warning">{stats.unused}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          Unused
                          <Tooltip content="Model settings that are not actively configured (all instances use default values)." />
                        </div>
                      </div>
                      <div className="bg-card rounded-lg p-6 border shadow-sm">
                        <div className="text-2xl font-bold text-destructive">{stats.missingDescriptions}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          Missing Descriptions
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {/* Data Table */}
                {!loading && modelSettings.length > 0 && (
                  <section>
                    <DataTable data={modelSettings} />
                  </section>
                )}

                {/* No Data Message */}
                {!loading && !error && modelSettings.length === 0 && (
                  <section className="text-center py-12">
                    <div className="max-w-md mx-auto">
                      <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">No Model Settings Found</h3>
                      <p className="text-muted-foreground">
                        No model settings were found in the database. Try refreshing the data or check your Snowflake connection.
                      </p>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Providers Tab */}
            {activeTab === 'providers' && (
              <>
                <div className="flex items-center gap-2 mb-6">
                  <Building className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Provider Model Settings</h2>
                </div>

                {/* Provider Selection */}
                <div className="bg-card rounded-lg p-6 border shadow-sm mb-6">
                  <h3 className="text-lg font-medium mb-4">Select Provider</h3>
                  
                  {!loadingProviders && providers.length > 0 && (
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search providers..."
                          value={providerSearchTerm}
                          onChange={(e) => setProviderSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}
                  
                  {loadingProviders && (
                    <div className="text-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-sm text-muted-foreground">Loading providers...</p>
                    </div>
                  )}

                  {!loadingProviders && providers.length > 0 && (
                    <>
                      {filteredProviders.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredProviders.map((provider) => (
                            <button
                              key={provider.id}
                              onClick={() => handleProviderSelect(provider)}
                              className={`p-4 text-left border rounded-lg transition-colors ${
                                selectedProvider?.id === provider.id
                                  ? 'border-primary bg-primary/5 text-primary'
                                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                              }`}
                            >
                              <div className="font-medium">{provider.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {provider.businessUnitCount} Business Units
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Search className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No providers match your search</p>
                          <button
                            onClick={() => setProviderSearchTerm('')}
                            className="text-sm text-primary hover:underline mt-2"
                          >
                            Clear search
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {!loadingProviders && providers.length === 0 && (
                    <div className="text-center py-8">
                      <Building className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No providers found</p>
                    </div>
                  )}
                </div>

                {/* Selected Provider Settings */}
                {selectedProvider && (
                  <div className="bg-card rounded-lg p-6 border shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium">
                          Model Settings for {selectedProvider.name}
                        </h3>
                        {groupedProviderSettings.length > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Pod: {groupedProviderSettings[0].overrides[0].pod}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          {groupedProviderSettings.length} model settings
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={expandAllSettings}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors"
                          >
                            <Expand className="h-3 w-3" />
                            Expand All
                          </button>
                          <button
                            onClick={collapseAllSettings}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                          >
                            <Minimize className="h-3 w-3" />
                            Collapse All
                          </button>
                        </div>
                      </div>
                    </div>

                    {loadingProviderSettings && (
                      <div className="text-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                        <p className="text-muted-foreground">Loading provider settings...</p>
                      </div>
                    )}

                    {!loadingProviderSettings && groupedProviderSettings.length > 0 && (
                      <div className="space-y-4">
                        {groupedProviderSettings.map((group) => {
                          const isExpanded = expandedSettings.has(group.settingName);
                          const actualOverrides = group.overrides.filter(override => override.overrideType !== 'default');
                          const defaultValue = group.overrides.find(override => override.overrideType === 'default')?.defaultValue || 
                                              group.overrides[0]?.defaultValue || '';
                          
                          return (
                            <div key={group.settingName} className="border border-border rounded-lg">
                              <button
                                onClick={() => toggleSettingExpansion(group.settingName)}
                                className="w-full p-4 text-left hover:bg-muted/50 transition-colors rounded-t-lg"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-lg">{group.settingName}</h4>
                                    {group.description && (
                                      <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                      {actualOverrides.length > 0 ? 
                                        `${actualOverrides.length} override${actualOverrides.length !== 1 ? 's' : ''}` :
                                        'Default only'
                                      }
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                              </button>
                              
                              {isExpanded && (
                                <div className="border-t">
                                  {/* Default Value Section */}
                                  <div className="p-4 bg-muted/20 border-b">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 font-medium">
                                        Default
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-xs text-muted-foreground">Value:</span>
                                      <div className="font-mono text-sm break-all mt-1">
                                        {defaultValue.length > 50 ? (
                                          <>
                                            {expandedValues.has(`default-${group.settingName}`) 
                                              ? defaultValue 
                                              : truncateValue(defaultValue)}
                                            <button
                                              onClick={() => toggleValueExpansion(`default-${group.settingName}`)}
                                              className="ml-2 text-xs text-primary hover:underline"
                                            >
                                              {expandedValues.has(`default-${group.settingName}`) ? 'Show less' : 'Show more'}
                                            </button>
                                          </>
                                        ) : (
                                          defaultValue
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Overrides Section - only show if there are actual overrides */}
                                  {actualOverrides.length > 0 && (
                                    <div className="p-4 space-y-3">
                                      <h5 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                                        Overrides
                                      </h5>
                                      {actualOverrides.map((override, index) => (
                                        <div key={index} className="bg-card border rounded-lg p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                              <span className={`text-xs px-2 py-1 rounded ${
                                                override.overrideType === 'provider' ? 'bg-blue-100 text-blue-800' :
                                                override.overrideType === 'business_unit' ? 'bg-green-100 text-green-800' :
                                                'bg-purple-100 text-purple-800'
                                              }`}>
                                                {override.overrideType === 'business_unit' ? 'PBU' : override.overrideType}
                                              </span>
                                              <span className="font-medium">
                                                {override.overrideType === 'business_unit' && override.businessUnitName 
                                                  ? override.businessUnitName 
                                                  : override.overrideType === 'user' 
                                                  ? `User ID: ${override.userId}` 
                                                  : override.providerName}
                                              </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {override.percentEnabled}% enabled
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <span className="text-xs text-muted-foreground">Override Value:</span>
                                            <div className="font-mono text-sm break-all mt-1">
                                              {override.overrideValue && override.overrideValue.length > 50 ? (
                                                <>
                                                  {expandedValues.has(`override-${override.settingName}-${index}`) 
                                                    ? override.overrideValue 
                                                    : truncateValue(override.overrideValue)}
                                                  <button
                                                    onClick={() => toggleValueExpansion(`override-${override.settingName}-${index}`)}
                                                    className="ml-2 text-xs text-primary hover:underline"
                                                  >
                                                    {expandedValues.has(`override-${override.settingName}-${index}`) ? 'Show less' : 'Show more'}
                                                  </button>
                                                </>
                                              ) : (
                                                override.overrideValue || 'N/A'
                                              )}
                                            </div>
                                          </div>
                                          
                                          {override.overrideUpdatedOn && (
                                            <div className="mt-2 text-xs text-muted-foreground">
                                              Updated: {new Date(override.overrideUpdatedOn).toLocaleString()}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* No Overrides Message */}
                                  {actualOverrides.length === 0 && (
                                    <div className="p-4 text-center text-muted-foreground">
                                      <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">This setting uses only the default value</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {!loadingProviderSettings && groupedProviderSettings.length === 0 && (
                      <div className="text-center py-12">
                        <Settings className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">No Settings Found</h3>
                        <p className="text-muted-foreground">
                          No model settings with overrides found for this provider.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Index;