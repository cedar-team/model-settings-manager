const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { execSync } = require('child_process');

/**
 * Generate a mapping of model setting names to teams based on CODE_OWNERSHIP.yml
 * This uses the proper team names like "Payment Workflows" and "Clarity"
 */
function generateTeamMappingFromYaml() {
  console.log('🔍 Parsing CODE_OWNERSHIP.yml for proper team mappings...');
  
  try {
    // Get Cedar root path - assume we're in model-settings-page subdirectory  
const cedarRoot = path.join(__dirname, '../../');
    
    // Read and parse the YAML file
    const yamlPath = path.join(cedarRoot, 'CODE_OWNERSHIP.yml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
    const ownershipData = yaml.load(yamlContent);
    
    console.log(`📋 Found ${ownershipData.teams.length} teams in ownership file`);
    
    // Build a mapping from file paths to team names
    const pathToTeam = new Map();
    
    ownershipData.teams.forEach(team => {
      const teamName = team.name;
      
      if (team.systems) {
        team.systems.forEach(system => {
          if (system.files) {
            system.files.forEach(file => {
              if (file.path) {
                // Store the path mapping, handling both exact paths and directory paths
                pathToTeam.set(file.path, teamName);
                
                // Also store directory mappings (for paths ending with /)
                if (file.path.endsWith('/')) {
                  pathToTeam.set(file.path.slice(0, -1), teamName);
                }
              }
            });
          }
        });
      }
    });
    
    console.log(`🗂️  Created path mapping for ${pathToTeam.size} paths`);
    
    // Find all model_settings Python files in the codebase
    const findCommand = `find ${cedarRoot} -path "*/model_settings/*.py" | grep -v ".mypy_cache" | grep -v "__pycache__" | grep -v "__init__.py"`;
    const stdout = execSync(findCommand, { encoding: 'utf-8' });
    const settingFiles = stdout.trim().split('\n').filter(line => line.trim());
    
    console.log(`📁 Found ${settingFiles.length} model setting files`);
    
    const teamMapping = {};
    const teamStats = {};
    let matchedCount = 0;
    let unmatchedFiles = [];
    
    // Build a mapping from model_settings directories to teams based on __init__.py ownership
    const directoryToTeam = new Map();
    for (const [ownedPath, teamName] of pathToTeam.entries()) {
      if (ownedPath.includes('/model_settings/__init__.py')) {
        // Extract the directory path (remove /__init__.py)
        const dirPath = ownedPath.replace('/__init__.py', '');
        directoryToTeam.set(dirPath, teamName);
        console.log(`📁 Directory ownership: ${dirPath} → ${teamName}`);
      }
    }
    
    settingFiles.forEach(filePath => {
      // Convert absolute path to relative path from project root
      // Make sure we handle the path properly whether cedarRoot has trailing slash or not
      const rootWithSlash = cedarRoot.endsWith('/') ? cedarRoot : cedarRoot + '/';
      const relativePath = filePath.replace(rootWithSlash, '');
      
      // Extract actual setting name from the Python file content
      let settingName = null;
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        
        // Look for name="..." or name='...' in the file
        const nameMatch = fileContent.match(/name=["']([^"']+)["']/);
        if (nameMatch) {
          settingName = nameMatch[1];
        } else {
          // Fallback to filename if no name= found
          settingName = path.basename(filePath, '.py');
          console.log(`⚠️  No name= found in ${relativePath}, using filename: ${settingName}`);
        }
      } catch (error) {
        // Fallback to filename if file can't be read
        settingName = path.basename(filePath, '.py');
        console.log(`⚠️  Error reading ${relativePath}, using filename: ${settingName}`);
      }
      
      // Find the team that owns this file
      let owningTeam = 'Unknown';
      
      // First try exact path match
      if (pathToTeam.has(relativePath)) {
        owningTeam = pathToTeam.get(relativePath);
        matchedCount++;
        console.log(`  ✅ Exact match: ${settingName} → ${owningTeam} (via ${relativePath})`);
      } else {
        // Try to find a parent directory match
        let found = false;
        for (const [ownedPath, teamName] of pathToTeam.entries()) {
          // Check if the file is under a directory owned by this team
          if (relativePath.startsWith(ownedPath + '/') || 
              (ownedPath.endsWith('/') && relativePath.startsWith(ownedPath))) {
            owningTeam = teamName;
            matchedCount++;
            found = true;
            break;
          }
        }
        
        // If still not found, check if the parent model_settings directory has a team-owned __init__.py
        if (!found) {
          // Extract the directory containing this model setting
          const dirPath = path.dirname(relativePath);
          if (directoryToTeam.has(dirPath)) {
            owningTeam = directoryToTeam.get(dirPath);
            matchedCount++;
            found = true;
            console.log(`  📂 Directory-based match: ${settingName} → ${owningTeam} (via ${dirPath})`);
          }
        }
        
        if (!found) {
          unmatchedFiles.push(relativePath);
        }
      }
      
      // Store mapping
      teamMapping[settingName] = owningTeam;
      
      // Track stats
      if (!teamStats[owningTeam]) {
        teamStats[owningTeam] = 0;
      }
      teamStats[owningTeam]++;
      
      if (owningTeam !== 'Unknown') {
        console.log(`  📝 ${settingName} → ${owningTeam}`);
      }
    });
    
    // Show unmatched files for debugging
    if (unmatchedFiles.length > 0) {
      console.log(`\n⚠️  ${unmatchedFiles.length} files not matched to teams:`);
      unmatchedFiles.slice(0, 10).forEach(file => {
        console.log(`    ${file}`);
      });
      if (unmatchedFiles.length > 10) {
        console.log(`    ... and ${unmatchedFiles.length - 10} more`);
      }
    }
    
    // Generate summary
    const summary = {
      total_settings: Object.keys(teamMapping).length,
      total_teams: Object.keys(teamStats).length,
      matched_count: matchedCount,
      unmatched_count: unmatchedFiles.length,
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
    
    console.log('\n📊 YAML-BASED TEAM MAPPING SUMMARY');
    console.log(`Total settings: ${summary.total_settings}`);
    console.log(`Total teams: ${summary.total_teams}`);
    console.log(`Matched to teams: ${summary.matched_count}`);
    console.log(`Unmatched (Unknown): ${summary.unmatched_count}`);
    console.log('\nSettings by team:');
    
    Object.entries(teamStats)
      .sort(([,a], [,b]) => b - a)
      .forEach(([team, count]) => {
        console.log(`  ${team}: ${count} settings`);
      });
    
    console.log(`\n✅ YAML-based team mapping saved to: ${outputPath}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Error generating YAML-based team mapping:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  generateTeamMappingFromYaml();
}

module.exports = { generateTeamMappingFromYaml };