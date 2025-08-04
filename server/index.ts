const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
// const { generateTeamMappingFromYaml } = require('./generate-team-mapping-from-yaml');

// Define Express types for TypeScript
interface ExpressRequest {
  params?: any;
  query?: any;
  body?: any;
  headers?: any;
}

interface ExpressResponse {
  json: (data: any) => void;
  status: (code: number) => ExpressResponse;
  send: (data: any) => void;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Snowflake configuration - use connection-based authentication for Okta SSO
const SNOWSQL_CMD = [
  'snow',
  'sql',
  '--connection',
  'default'
];

// Query to get all model settings with basic info (unique by name)
const ALL_MODEL_SETTINGS_QUERY = `
SELECT 
  ms.name,
  MAX(ms.description) as description,
  MAX(ms.created_on::date) as created_date
FROM django_model_settings_modelsetting ms
GROUP BY ms.name
ORDER BY ms.name;`;

// Query to get unused model settings (not actively configured)
const UNUSED_MODEL_SETTINGS_QUERY = `
SELECT
    ms.name
FROM
    django_model_settings_modelsetting ms
LEFT JOIN
    django_model_settings_modelsettingvalue msv ON ms.id = msv.model_setting_id AND ms.pod_prefix = msv.pod_prefix
WHERE 
    ms.conditional_schema IS NULL
GROUP BY
    ms.name
HAVING
    COUNT(DISTINCT ms.value) = 1 -- Ensures all 'ms.value's for this 'ms.name' are the same
    AND COUNT(CASE WHEN msv.value = ms.value THEN 1 ELSE NULL END) = COUNT(msv.value) -- Ensures all 'msv.value's match 'ms.value'
    AND COUNT(CASE WHEN msv.value IS NOT NULL AND msv.percent <> 100 THEN 1 ELSE NULL END) = 0
ORDER BY
    ms.name;`;

interface ModelSetting {
  name: string;
  description: string;
  created_date: string;
  inUse: boolean;
  team: string;
}

interface ModelSettingBasic {
  name: string;
  description?: string;
  created_date?: string;
}

interface SnowflakeResponse {
  success: boolean;
  data: ModelSetting[];
  count: number;
  error?: string;
}

// Load team mapping from JSON file
let teamMapping: Record<string, string> = {};

function loadTeamMapping(): boolean {
  try {
    const teamMappingPath = path.join(__dirname, 'team-mapping.json');
    const teamMappingData = JSON.parse(fs.readFileSync(teamMappingPath, 'utf-8'));
    teamMapping = teamMappingData.mapping || {};
    console.log(`📋 Loaded team mapping for ${Object.keys(teamMapping).length} settings`);
    return true;
  } catch (error) {
    console.warn('⚠️  Could not load team mapping:', (error as Error).message);
    return false;
  }
}

// Load team mapping on startup
loadTeamMapping();

// Check if Snowflake CLI is installed
async function checkSnowflakeCLI(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('snow', ['--version']);
    
    child.on('error', () => {
      resolve(false);
    });
    
    child.on('close', (code: number | null) => {
      resolve(code === 0);
    });
  });
}

// Execute a raw Snowflake query preserving all columns
async function executeRawSnowflakeQuery(query: string): Promise<any[]> {
  console.log('Executing raw Snowflake query...');

  return new Promise((resolve, reject) => {
    const cmd = [
      'snow',
      'sql',
      '--account',
      'hj82563.us-east-1.privatelink',
      '--user',
      process.env.USER || '',
      '--database',
      'cedar',
      '--schema',
      'bi_public',
      '--warehouse',
      'compute_wh',
      '--authenticator',
      'externalbrowser',
      '-x',
      '--format',
      'json',
      '-q',
      query.trim()
    ];
    console.log('Executing command:', cmd.join(' '));
    const child = spawn(cmd[0], cmd.slice(1));

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Snowflake query timed out'));
    }, 60000); // 60 second timeout

    child.on('close', (code: number | null) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(`Snowflake query failed: ${stderr}`));
        return;
      }

      try {
        // Parse JSON output from snow CLI
        console.log('Snowflake JSON output length:', stdout.length);

        // Remove any non-JSON content (like warnings) and find the JSON array
        const lines = stdout.split('\n');
        let jsonStart = -1;
        let jsonEnd = -1;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('[')) {
            jsonStart = i;
          }
          if (lines[i].trim().endsWith(']') && jsonStart !== -1) {
            jsonEnd = i;
            break;
          }
        }

        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('No valid JSON array found in Snowflake output');
        }

        const jsonText = lines.slice(jsonStart, jsonEnd + 1).join('\n');
        console.log('Parsing JSON of length:', jsonText.length);

        const jsonData = JSON.parse(jsonText);
        console.log('Parsed', jsonData.length, 'rows from JSON');

        // Return raw results without column mapping
        console.log('Raw results sample:', jsonData.slice(0, 2));
        resolve(jsonData);
      } catch (error) {
        reject(new Error(`Failed to parse Snowflake JSON output: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });

    child.on('error', (error: Error) => {
      clearTimeout(timeout);
      reject(new Error(`Error executing Snowflake query: ${error.message}`));
    });
  });
}

// Execute a single Snowflake query directly (for model settings)
async function executeSnowflakeQuery(query: string): Promise<any[]> {
  console.log('Executing Snowflake query...');
  
  return new Promise((resolve, reject) => {
    const cmd = [
      'snow',
      'sql',
      '--account',
      'hj82563.us-east-1.privatelink',
      '--user',
      process.env.USER || '',
      '--database',
      'cedar',
      '--schema',
      'bi_public',
      '--warehouse',
      'compute_wh',
      '--authenticator',
      'externalbrowser',
      '-x',
      '--format',
      'json',
      '-q',
      query.trim()
    ];
    console.log('Executing command:', cmd.join(' '));
    const child = spawn(cmd[0], cmd.slice(1));
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });
    
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Snowflake query timed out'));
    }, 60000); // 60 second timeout
    
    child.on('close', (code: number | null) => {
      clearTimeout(timeout);
      
      if (code !== 0) {
        reject(new Error(`Snowflake query failed: ${stderr}`));
        return;
      }
      
      try {
        // Parse JSON output from snow CLI
        console.log('Snowflake JSON output length:', stdout.length);
        
        // Remove any non-JSON content (like warnings) and find the JSON array
        const lines = stdout.split('\n');
        let jsonStart = -1;
        let jsonEnd = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('[')) {
            jsonStart = i;
          }
          if (lines[i].trim().endsWith(']') && jsonStart !== -1) {
            jsonEnd = i;
            break;
          }
        }
        
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('No valid JSON array found in Snowflake output');
        }
        
        const jsonText = lines.slice(jsonStart, jsonEnd + 1).join('\n');
        console.log('Parsing JSON of length:', jsonText.length);
        
        const jsonData = JSON.parse(jsonText);
        console.log('Parsed', jsonData.length, 'rows from JSON');
        
        // Convert to lowercase keys to match our interface
        const results = jsonData.map((row: any) => ({
          name: row.NAME || '',
          description: row.DESCRIPTION || '',
          created_date: row.CREATED_DATE || ''
        }));
        
        console.log('Converted results sample:', results.slice(0, 2));
        resolve(results);
      } catch (error) {
        reject(new Error(`Failed to parse Snowflake JSON output: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    });
    
    child.on('error', (error: Error) => {
      clearTimeout(timeout);
      reject(new Error(`Error executing Snowflake query: ${error.message}`));
    });
  });
}

// Get all model settings with usage information
async function getAllModelSettings(): Promise<ModelSetting[]> {
  try {
    // Execute all three queries in parallel
    const [allSettings, unusedSettings] = await Promise.all([
      executeSnowflakeQuery(ALL_MODEL_SETTINGS_QUERY),
      executeSnowflakeQuery(UNUSED_MODEL_SETTINGS_QUERY),
    ]);

    console.log('All settings count:', allSettings.length);
    console.log('All settings sample:', allSettings.slice(0, 2));
    console.log('Unused settings count:', unusedSettings.length);
    console.log('Unused settings sample:', unusedSettings.slice(0, 2));

    // Create sets for faster lookup
    const unusedNames = new Set(unusedSettings.map(s => s.name));
    // Used names is all settings minus unused settings
    const usedNames = new Set(allSettings.map(s => s.name).filter(name => !unusedNames.has(name)));

    // Combine all settings with usage information and team data
    const combinedSettings: ModelSetting[] = allSettings.map(setting => ({
      name: setting.name || '',
      description: setting.description || '',
      created_date: setting.created_date || '',
      inUse: usedNames.has(setting.name) && !unusedNames.has(setting.name),
      team: teamMapping[setting.name] || 'Unknown'
    }));

    console.log('Combined settings count:', combinedSettings.length);
    return combinedSettings;
  } catch (error) {
    console.error('Error getting model settings:', error);
    throw error;
  }
}

// Routes
app.get('/api/model-settings/all', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const allSettings = await getAllModelSettings();
    
    const response: SnowflakeResponse = {
      success: true,
      data: allSettings,
      count: allSettings.length
    };
    
    console.log('Sending response with', allSettings.length, 'model settings');
    res.json(response);
  } catch (error) {
    console.error('Error fetching model settings:', error);
    
    const response: SnowflakeResponse = {
      success: false,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(response);
  }
});

app.post('/api/model-settings/refresh', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const allSettings = await getAllModelSettings();
    
    const response: SnowflakeResponse = {
      success: true,
      data: allSettings,
      count: allSettings.length
    };
    
    console.log('Refresh response with', allSettings.length, 'model settings');
    res.json(response);
  } catch (error) {
    console.error('Error refreshing model settings:', error);
    
    const response: SnowflakeResponse = {
      success: false,
      data: [],
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    res.status(500).json(response);
  }
});

// Refresh team mapping endpoint
app.post('/api/team-mapping/refresh', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    console.log('🔄 Refreshing team mapping from CODE_OWNERSHIP.yml...');
    
    // Generate new team mapping
    // const result = await generateTeamMappingFromYaml();
    const result = { summary: 'Team mapping refresh temporarily disabled' };
    
    // Reload team mapping into memory
    const loaded = loadTeamMapping();
    
    if (loaded) {
      console.log('✅ Team mapping refreshed successfully');
      res.json({ 
        success: true, 
        message: 'Team mapping refreshed successfully',
        settingsCount: Object.keys(teamMapping).length,
        summary: result.summary
      });
    } else {
      throw new Error('Failed to reload team mapping after generation');
    }
  } catch (error) {
    console.error('❌ Error refreshing team mapping:', error);
    res.status(500).json({ 
      success: false, 
      error: (error as Error).message 
    });
  }
});

// New endpoint for detailed model setting information
app.get('/api/model-settings/:settingName/details', async (req: ExpressRequest, res: ExpressResponse) => {
  const { settingName } = req.params;
  
  try {
    console.log(`🔍 Getting details for setting: ${settingName}`);
    
    // Combined query to show both specific overrides AND default values per pod
    const detailQuery = `
      -- Specific provider/business unit/auth user overrides
      SELECT
        ms.name AS "Setting Name",
        COALESCE(p.name, pbu_provider.name, CONCAT('User: ', au.username)) AS "Provider name",
        msv.value AS "Specific value",
        ms.value AS "Default value",
        pbu.name AS "Business Unit Name",
        msv.percent AS "Percent enabled",
        msv.key as "Value key",
        ms.pod_prefix as "Pod",
        msv.updated_on AS "Value updated on",
        ms.created_on AS "Setting created on",
        ms.conditional_schema as "Conditional schema",
        msv.conditional as "Conditional",
        CASE 
          WHEN au.username IS NOT NULL THEN 'user_override'
          WHEN pbu.name IS NOT NULL THEN 'business_unit_override'  
          WHEN p.name IS NOT NULL OR pbu_provider.name IS NOT NULL THEN 'provider_override'
          ELSE 'override'
        END as "Record type"
      FROM django_model_settings_modelsetting ms
      JOIN django_model_settings_modelsettingvalue msv
        ON ms.id = msv.model_setting_id AND ms.pod_prefix = msv.pod_prefix
      LEFT JOIN provider p
        ON CAST(SPLIT_PART(msv.key, ':', 2) AS INT) = p.id AND SPLIT_PART(msv.key, ':', 1) = 'provider'
      LEFT JOIN provider_business_unit pbu
        ON CAST(SPLIT_PART(msv.key, ':', 2) AS INT) = pbu.id AND SPLIT_PART(msv.key, ':', 1) = 'provider_business_unit'
      LEFT JOIN auth_user au
        ON CAST(SPLIT_PART(msv.key, ':', 2) AS INT) = au.id AND SPLIT_PART(msv.key, ':', 1) = 'auth_user'
      LEFT JOIN provider pbu_provider
        ON pbu.provider_id = pbu_provider.id
      WHERE ms.name = '${settingName}'
      
      UNION ALL
      
      -- Base model setting default values per pod
      SELECT
        ms.name AS "Setting Name",
        'Default' AS "Provider name",
        ms.value AS "Specific value",
        ms.value AS "Default value",
        '' AS "Business Unit Name",
        100 AS "Percent enabled",
        'default' as "Value key",
        ms.pod_prefix as "Pod",
        ms.updated_on AS "Value updated on",
        ms.created_on AS "Setting created on",
        ms.conditional_schema as "Conditional schema",
        NULL as "Conditional",
        'default' as "Record type"
      FROM django_model_settings_modelsetting ms
      WHERE ms.name = '${settingName}'
      
      ORDER BY
        "Pod", "Record type", "Provider name"
    `;
    
    const rawDetails = await executeRawSnowflakeQuery(detailQuery);
    
    console.log(`📊 Found ${rawDetails.length} detail records for ${settingName}`);
    
    // Convert to more readable format using aliased column names from the detailed query
    const details = rawDetails.map((row: any) => ({
      settingName: row['Setting Name'] || row.SETTING_NAME || '',
      providerName: row['Provider name'] || row.PROVIDER_NAME || '',
      specificValue: row['Specific value'] || row.SPECIFIC_VALUE || '',
      defaultValue: row['Default value'] || row.DEFAULT_VALUE || '',
      businessUnitName: row['Business Unit Name'] || row.BUSINESS_UNIT_NAME || '',
      percentEnabled: row['Percent enabled'] || row.PERCENT_ENABLED || '',
      valueKey: row['Value key'] || row.VALUE_KEY || '',
      pod: row['Pod'] || row.POD || '',
      valueUpdatedOn: row['Value updated on'] || row.VALUE_UPDATED_ON || '',
      settingCreatedOn: row['Setting created on'] || row.SETTING_CREATED_ON || '',
      conditionalSchema: row['Conditional schema'] || row.CONDITIONAL_SCHEMA || '',
      conditional: row['Conditional'] || row.CONDITIONAL || '',
      recordType: row['Record type'] || row.RECORD_TYPE || ''
    }));
    
    res.json({
      success: true,
      settingName,
      data: details,
      count: details.length
    });
    
  } catch (error) {
    console.error('Error getting model setting details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get model setting details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check Snowflake CLI availability endpoint
app.get('/api/snowflake/status', async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const isAvailable = await checkSnowflakeCLI();
    res.json({ 
      snowflakeCliAvailable: isAvailable,
      message: isAvailable ? 'Snowflake CLI is available' : 'Snowflake CLI is not installed or not accessible'
    });
  } catch (error) {
    res.status(500).json({ 
      snowflakeCliAvailable: false, 
      error: 'Error checking Snowflake CLI status',
      message: 'Snowflake CLI is not installed or not accessible'
    });
  }
});

// Health check endpoint
app.get('/health', (req: ExpressRequest, res: ExpressResponse) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Model Settings API server running on http://localhost:${PORT}`);
  console.log(`📊 Snowflake integration ready`);
  console.log(`💾 Available endpoints:`);
  console.log(`   GET  /api/model-settings/all`);
  console.log(`   POST /api/model-settings/refresh`);
  console.log(`   POST /api/team-mapping/refresh`);
  console.log(`   GET  /api/model-settings/:settingName/details`);
  console.log(`   GET  /api/snowflake/status`);
  console.log(`   GET  /health`);
});