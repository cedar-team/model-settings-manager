const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate a mapping of model setting names to teams based on codebase file paths
 * Similar to the Python script logic for organizing settings by team ownership
 */
function generateTeamMapping() {
  console.log('🔍 Scanning codebase for model settings and team ownership...');
  
  try {
    // Find all model_settings Python files (excluding cache and __init__.py)
    const findCommand = `find /Users/awerner/code/cedar -path "*/model_settings/*.py" | grep -v ".mypy_cache" | grep -v "__pycache__" | grep -v "__init__.py"`;
    const stdout = execSync(findCommand, { encoding: 'utf-8' });
    const settingFiles = stdout.trim().split('\n').filter(line => line.trim());
    
    console.log(`📁 Found ${settingFiles.length} model setting files`);
    
    const teamMapping = {};
    const teamStats = {};
    
    settingFiles.forEach(filePath => {
      // Extract setting name from filename (remove .py extension)
      const fileName = path.basename(filePath, '.py');
      
      // Extract team from path
      let team = 'UNKNOWN';
      const pathParts = filePath.split('/');
      
      // Different patterns for team extraction
      if (filePath.includes('/api/')) {
        // Pattern: /api/{team_name}/model_settings/
        const apiIndex = pathParts.findIndex(part => part === 'api');
        if (apiIndex !== -1 && apiIndex + 1 < pathParts.length) {
          team = pathParts[apiIndex + 1];
        }
      } else if (filePath.includes('/integrations/')) {
        team = 'integrations';
      } else if (filePath.includes('/services/')) {
        // Pattern: /services/{service_name}/
        const servicesIndex = pathParts.findIndex(part => part === 'services');
        if (servicesIndex !== -1 && servicesIndex + 1 < pathParts.length) {
          team = `services::${pathParts[servicesIndex + 1]}`;
        }
      } else if (filePath.includes('/client/')) {
        team = 'client';
      }
      
      // Normalize team name (convert to proper case)
      team = team.replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Store mapping
      teamMapping[fileName] = team;
      
      // Track stats
      if (!teamStats[team]) {
        teamStats[team] = 0;
      }
      teamStats[team]++;
      
      console.log(`  📝 ${fileName} → ${team}`);
    });
    
    // Generate summary
    const summary = {
      total_settings: Object.keys(teamMapping).length,
      total_teams: Object.keys(teamStats).length,
      teams: teamStats,
      generated_at: new Date().toISOString()
    };
    
    const result = {
      summary,
      mapping: teamMapping
    };
    
    // Write to JSON file
    const outputPath = path.join(__dirname, 'team-mapping.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log('\n📊 TEAM MAPPING SUMMARY');
    console.log(`Total settings: ${summary.total_settings}`);
    console.log(`Total teams: ${summary.total_teams}`);
    console.log('\nSettings by team:');
    
    Object.entries(teamStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([team, count]) => {
        console.log(`  ${team}: ${count} settings`);
      });
    
    console.log(`\n✅ Team mapping saved to: ${outputPath}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error generating team mapping:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateTeamMapping();
}

module.exports = { generateTeamMapping };