import { useState, useEffect } from 'react';
import { DataTable } from '@/components/data-table';
import { Database, RefreshCw, BarChart3 } from 'lucide-react';
import { apiService } from '@/services/api';
import { ModelSetting } from '@/types';

const Index = () => {
  const [modelSettings, setModelSettings] = useState<ModelSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingTeamMapping, setRefreshingTeamMapping] = useState(false);

  const loadModelSettings = async () => {
    try {
      setError('');
      const data = await apiService.getAllModelSettings();
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
      const data = await apiService.refreshModelSettings();
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
      const data = await apiService.getAllModelSettings();
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

  useEffect(() => {
    loadModelSettings();
  }, []);

  const stats = {
    total: modelSettings.length,
    inUse: modelSettings.filter(item => item.inUse).length,
    unused: modelSettings.filter(item => !item.inUse).length,
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
                Analyze model settings data directly from Snowflake with advanced filtering and insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing || refreshingTeamMapping}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button
                onClick={handleRefreshTeamMapping}
                disabled={refreshing || refreshingTeamMapping}
                className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 disabled:opacity-50 transition-colors"
                title="Refresh team mappings from CODE_OWNERSHIP.yml"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingTeamMapping ? 'animate-spin' : ''}`} />
                {refreshingTeamMapping ? 'Updating Teams...' : 'Refresh Teams'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            <p className="font-medium">Error loading model settings:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
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
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                <div className="text-sm text-muted-foreground">Unused</div>
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
      </div>
    </div>
  );
};

export default Index;