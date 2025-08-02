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

  async getAllModelSettings(): Promise<ModelSetting[]> {
    const response = await this.request<{success: boolean, data: ModelSetting[], count: number}>('/model-settings/all');
    return response.data;
  }

  async refreshModelSettings(): Promise<ModelSetting[]> {
    console.log('Making API request to /model-settings/refresh');
    const response = await this.request<{success: boolean, data: ModelSetting[], count: number}>('/model-settings/refresh', {
      method: 'POST',
    });
    console.log('API response:', response);
    console.log('Returning data:', response.data);
    return response.data;
  }

  async refreshTeamMapping(): Promise<{success: boolean, message: string, settingsCount: number}> {
    console.log('Making API request to /team-mapping/refresh');
    const response = await this.request<{success: boolean, message: string, settingsCount: number}>('/team-mapping/refresh', {
      method: 'POST',
    });
    console.log('Team mapping refresh response:', response);
    return response;
  }
}

export const apiService = new ApiService();