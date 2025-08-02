# Model Settings Helper

A tool to manage and view Django model settings with team ownership information.

## Quick Start

1. **Generate team mapping:**
   ```bash
   cd server
   node generate-team-mapping-from-yaml.js
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **Open the app:**
   ```bash
   open http://localhost:3001
   ```

## API Endpoints

- `GET /api/model-settings/all` - Get all model settings
- `POST /api/model-settings/refresh` - Refresh data from Snowflake

## Requirements

- Node.js 18+
- Snowflake CLI installed and configured
- Access to the Cedar codebase (for team mapping)

## How it works

1. **Data Source**: Queries Snowflake directly using your existing authentication
2. **Team Mapping**: Scans the Cedar codebase and `CODE_OWNERSHIP.yml` to determine team ownership
3. **Usage Detection**: Analyzes Snowflake data to determine if settings are in use

## Development

The server runs on port 3001 and uses:
- Express.js for the API
- Snowflake CLI for database queries  
- Direct file system access for team mapping