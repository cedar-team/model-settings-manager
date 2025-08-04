import { cacheService, CACHE_KEYS } from './cache';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:3001/api' 
  : 'http://localhost:3001/api';

export interface ModelSetting {
  name: string;
  description: string;
  created_date: string;
  inUse: boolean;
  team: string;
}

export interface ApiError {
  message: string;
  detail?: string;
}

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getAllModelSettings(useCache: boolean = true): Promise<ModelSetting[]> {
    // Check cache first if useCache is true
    if (useCache) {
      const cached = cacheService.get<ModelSetting[]>(CACHE_KEYS.MODEL_SETTINGS);
      if (cached) {
        console.log('📦 Using cached model settings data');
        return cached;
      }
    }

    console.log('🌐 Fetching fresh model settings data from API');
    const response = await this.request<{success: boolean, data: ModelSetting[], count: number}>('/model-settings/all');
    
    // Cache the response
    cacheService.set(CACHE_KEYS.MODEL_SETTINGS, response.data);
    
    return response.data;
  }

  async refreshModelSettings(): Promise<ModelSetting[]> {
    console.log('🔄 Making API request to /model-settings/refresh');
    
    // Clear cache before refresh
    cacheService.clear(CACHE_KEYS.MODEL_SETTINGS);
    console.log('🗑️ Cleared model settings cache');
    
    const response = await this.request<{success: boolean, data: ModelSetting[], count: number}>('/model-settings/refresh', {
      method: 'POST',
    });
    console.log('API response:', response);
    console.log('Returning data:', response.data);
    
    // Cache the fresh data
    cacheService.set(CACHE_KEYS.MODEL_SETTINGS, response.data);
    
    return response.data;
  }

  async refreshTeamMapping(): Promise<{success: boolean, message: string, settingsCount: number}> {
    console.log('🔄 Making API request to /team-mapping/refresh');
    
    // Clear model settings cache since team mappings affect the data
    cacheService.clear(CACHE_KEYS.MODEL_SETTINGS);
    console.log('🗑️ Cleared model settings cache due to team mapping refresh');
    
    const response = await this.request<{success: boolean, message: string, settingsCount: number}>('/team-mapping/refresh', {
      method: 'POST',
    });
    console.log('Team mapping refresh response:', response);
    return response;
  }

  async checkSnowflakeStatus(): Promise<{snowflakeCliAvailable: boolean, message: string}> {
    console.log('Checking Snowflake CLI status');
    const response = await this.request<{snowflakeCliAvailable: boolean, message: string}>('/snowflake/status');
    console.log('Snowflake status response:', response);
    return response;
  }

  async getModelSettingDetails(settingName: string, useCache: boolean = true): Promise<any[]> {
    const cacheKey = CACHE_KEYS.MODEL_SETTING_DETAIL(settingName);
    
    // Check cache first if useCache is true
    if (useCache) {
      const cached = cacheService.get<any[]>(cacheKey);
      if (cached) {
        console.log(`📦 Using cached detail data for ${settingName}`);
        return cached;
      }
    }

    console.log(`🌐 Fetching fresh detail data for ${settingName}`);
    const response = await this.request<{success: boolean, data: any[]}>(`/model-settings/${encodeURIComponent(settingName)}/details`);
    
    if (response.success) {
      // Cache the response
      cacheService.set(cacheKey, response.data);
      return response.data;
    } else {
      throw new Error('Failed to load details');
    }
  }

  // Method to clear all caches (useful for debugging or manual clearing)
  clearAllCaches(): void {
    cacheService.clearAll();
    console.log('🗑️ Cleared all caches');
  }
}

export const apiService = new ApiService();