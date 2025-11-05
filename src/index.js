const core = require('@actions/core');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const os = require('os');

/**
 * Checks if Maven is available in the environment
 */
async function checkMavenAvailable() {
  try {
    const { exec } = require('@actions/exec');
    let output = '';
    const options = {
      listeners: {
        stdout: (data) => {
          output += data.toString();
        }
      },
      silent: true
    };
    
    const exitCode = await exec('mvn', ['--version'], options);
    if (exitCode === 0) {
      core.info(`Maven is available: ${output.split('\n')[0]}`);
      return true;
    }
  } catch (error) {
    core.debug(`Maven check failed: ${error.message}`);
  }
  return false;
}

/**
 * Performs OAuth client credentials flow to obtain access token
 */
async function getAccessToken(tokenEndpoint, clientId, clientSecret, scope) {
  core.info('Requesting OAuth access token...');
  
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret
  });
  
  if (scope) {
    params.append('scope', scope);
  }
  
  try {
    const response = await axios.post(tokenEndpoint, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });
    
    if (response.status === 200 && response.data && response.data.access_token) {
      core.info('Successfully obtained access token');
      return response.data.access_token;
    } else {
      throw new Error('No access token in response');
    }
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      throw new Error(`OAuth request failed with status ${status}: ${JSON.stringify(data)}`);
    } else if (error.request) {
      throw new Error(`No response received from OAuth server: ${error.message}`);
    } else {
      throw new Error(`OAuth request error: ${error.message}`);
    }
  }
}

/**
 * Creates Maven settings.xml file with the access token
 */
function createMavenSettings(accessToken, serverId, settingsPath) {
  core.info(`Creating Maven settings.xml at: ${settingsPath}`);
  
  const settingsXml = `<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.2.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.2.0 
                              http://maven.apache.org/xsd/settings-1.2.0.xsd">
    <mirrors>
        <mirror>
        <id>${serverId}</id>
        <name>Curity Maven Repository</name>
        <url>https://hub.curityio.net/repository/curity-release-repo/</url>
        <mirrorOf>*</mirrorOf>
        <configuration>
            <httpHeaders>
            <property>
                <name>Authorization</name>
                <value>Bearer ${accessToken}</value>
            </property>
            </httpHeaders>
        </configuration>
        </mirror>
    </mirrors>
</settings>`;

  // Ensure the directory exists
  const settingsDir = path.dirname(settingsPath);
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }
  
  fs.writeFileSync(settingsPath, settingsXml, 'utf8');
  core.info('Maven settings.xml created successfully');
  
  return settingsPath;
}

/**
 * Main action function
 */
async function run() {
  try {
    // Check if Maven is available
    const mavenAvailable = await checkMavenAvailable();
    if (!mavenAvailable) {
      core.setFailed('Maven is not available in the environment. Please use an action like actions/setup-java with Maven or setup-maven to install Maven first.');
      return;
    }
    
    // Get inputs
    const oauthServerUrl = 'https://login.curity.io/internal/oauth-token';
    const clientId = 'curity-cli-github';
    const clientSecret = core.getInput('client-secret', { required: true });
    const scope = '';
    const serverId = 'curity-repo';
    const settingsPath = path.join(os.homedir(), '.m2', 'settings.xml');
    
    // Validate inputs
    if (!clientSecret.trim()) {
      throw new Error('client-secret cannot be empty');
    }
    
    // Get access token
    const accessToken = await getAccessToken(oauthServerUrl, clientId, clientSecret, scope);
    
    // Create Maven settings
    const createdSettingsPath = createMavenSettings(accessToken, serverId, settingsPath);
    
    // Set outputs
    core.setOutput('settings-file', createdSettingsPath);
    core.setSecret(accessToken); // Mask the token in logs
    core.setOutput('access-token', accessToken);
    
    core.info('Action completed successfully');
    
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

// Export for testing
module.exports = {
  run,
  getAccessToken,
  createMavenSettings,
  checkMavenAvailable
};

// Run the action if this file is executed directly
if (require.main === module) {
  run();
}
