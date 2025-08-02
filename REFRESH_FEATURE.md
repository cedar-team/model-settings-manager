# Refresh Feature Documentation

## Overview

The Model Settings Manager now includes a **Refresh** feature that automatically fetches unused model settings directly from Snowflake, eliminating the need to manually export and upload CSV files for unused model settings. This feature is implemented as a **standalone Express.js backend** within the model-settings-page project.

## Architecture

### 🏗️ Standalone Backend
- **Express.js Server**: Runs on `http://localhost:3001`
- **Independent Service**: No dependency on main Django API
- **TypeScript Support**: Full type safety for backend logic
- **Concurrent Development**: Runs alongside React frontend

### 🔄 Refresh Button
- Located in the "Unused Model Settings" upload component
- Only visible when no CSV file is currently uploaded
- Fetches data directly from Snowflake using the same query logic as `model_settings_utils`

### 🌐 API Endpoints
- **Base URL**: `http://localhost:3001/api`
- **GET** `/model-settings/unused/` - Fetch unused model settings
- **POST** `/model-settings/unused/refresh/` - Refresh unused model settings
- **GET** `/health` - Health check endpoint

### 📋 Response Format
```json
{
  "success": true,
  "data": [
    {"name": "model_setting_1"},
    {"name": "model_setting_2"}
  ],
  "count": 2
}
```

### ⚡ Frontend Integration
- Seamless integration with existing CSV upload workflow
- Loading states and error handling
- Results populate the same data structure as CSV uploads

## How It Works

### 1. Snowflake Query
The backend uses the same SQL query from `model_settings_utils`:

```sql
-- Finds model settings that are unused by checking:
-- 1. Only one value exists
-- 2. All values are the same
-- 3. Percent value is 100
-- 4. No conditional schema
SELECT ms.name
FROM django_model_settings_modelsetting ms
LEFT JOIN django_model_settings_modelsettingvalue msv 
  ON ms.id = msv.model_setting_id AND ms.pod_prefix = msv.pod_prefix
WHERE ms.conditional_schema IS NULL
GROUP BY ms.name
HAVING 
  COUNT(DISTINCT ms.value) = 1
  AND COUNT(CASE WHEN msv.value = ms.value THEN 1 ELSE NULL END) = COUNT(msv.value)
  AND COUNT(CASE WHEN msv.value IS NOT NULL AND msv.percent <> 100 THEN 1 ELSE NULL END) = 0
ORDER BY ms.name;
```

### 2. Snowflake CLI Integration
- Uses `snow` CLI with externalbrowser authentication
- Connects to: `hj82563.us-east-1.privatelink`
- Database: `cedar`, Schema: `bi_public`
- Output format: JSON for easy parsing

### 3. Data Processing
- Backend converts Snowflake results to API format
- Frontend transforms API response to match CSV structure
- Seamlessly integrates with existing data analysis pipeline

## Usage

### For End Users
1. Navigate to the Model Settings Manager
2. In the "Unused Model Settings" section, click **"Refresh from Snowflake"**
3. Wait for the data to load (usually 5-15 seconds)
4. Data will be automatically populated and ready for analysis

### For Developers
- Frontend API service: `apiService.refreshUnusedModelSettings()`
- Backend view: `UnusedModelSettingsAPIView`
- URL pattern: `/api/model-settings/unused/refresh/`

## Requirements

### Backend Prerequisites
- Snowflake CLI (`snow`) must be installed
- User must be authenticated with Snowflake externalbrowser
- Network access to Snowflake instance

### Error Handling
- **CLI Not Installed**: Returns 500 error with helpful message
- **Authentication Failed**: Returns 500 error with Snowflake details
- **Query Timeout**: 60-second timeout with clear error message
- **Network Issues**: Graceful degradation with fallback to CSV upload

## Development Notes

### File Structure
```
Frontend:
- src/components/csv-upload.tsx (refresh button UI)
- src/services/api.ts (API client for Express backend)
- src/pages/Index.tsx (integration logic)

Standalone Backend:
- server/index.ts (Express server with Snowflake integration)
- server/tsconfig.json (TypeScript configuration)
- server/nodemon.json (Development server configuration)
```

### Environment Configuration
- **Frontend**: React app runs on `http://localhost:5173`
- **Backend**: Express API runs on `http://localhost:3001`
- **API Base URL**: `http://localhost:3001/api` for both dev and prod
- **CORS**: Enabled for cross-origin requests from frontend

## Testing

### Manual Testing
1. Install dependencies: `npm install`
2. Start both servers: `npm run dev` (or individually with `npm run dev:frontend` and `npm run dev:backend`)
3. Navigate to `http://localhost:5173`
4. Click "Refresh from Snowflake" in the unused settings section
5. Verify data loads and integrates with existing analysis

### API Testing
```bash
# Test the health endpoint
curl http://localhost:3001/health

# Test the unused model settings endpoint
curl http://localhost:3001/api/model-settings/unused

# Test the refresh endpoint
curl -X POST http://localhost:3001/api/model-settings/unused/refresh
```

## Future Enhancements

- [ ] Cache Snowflake results for faster subsequent loads
- [ ] Add refresh capability for "Remaining Model Settings" 
- [ ] Implement background refresh with notifications
- [ ] Add data freshness indicators
- [ ] Support for filtering and advanced queries