
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
function loadConfig() {
  const homeDir = require('os').homedir();
  const configPath = path.join(homeDir, '.autoconfig-config');
  console.log(configPath);
  if (fs.existsSync(configPath)) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      vscode.window.showErrorMessage(`Error reading configuration file: ${error.message}`);
    }
  } else {
    vscode.window.showWarningMessage('.autoconfig-config configuration file not found in the root directory: \n '+homeDir);
  }
  return null;
}

module.exports = {
    loadConfig
};