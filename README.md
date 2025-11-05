# Maven OAuth Action

A GitHub Action that uses OAuth client credentials flow to obtain an access token and creates a Maven `settings.xml` file with that token for authentication.

## Features

- 🔐 Secure OAuth client credentials flow
- 📁 Automatic Maven `settings.xml` generation
- 🧹 Automatic cleanup of sensitive files
- ✅ Maven environment validation
- 🎯 Configurable server IDs and paths

## Prerequisites

**Important**: This action requires Maven to be available in the runner environment. Use an action like `actions/setup-java` with Maven or `stCarolas/setup-maven` before using this action.

## Usage

### Example

```yaml
name: Build with Maven OAuth

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      # Setup Java and Maven (required prerequisite)
      - name: Set up JDK and Maven
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          
      # Setup Maven with OAuth token
      - name: Setup Maven with OAuth
        uses: your-org/maven-oauth-action@v1
        with:
          client-secret: ${{ secrets.CURITY_CLI_CLIENT_SECRET }}
          
      # Use Maven with the configured settings
      - name: Build with Maven
        run: mvn package -s ${{ steps.setup-maven.outputs.settings-file }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `client-secret` | OAuth client secret | ✅ Yes | |

## Outputs

| Output | Description |
|--------|-------------|
| `settings-file` | Path to the created Maven settings.xml file |
| `access-token` | The obtained access token (masked in logs) |

## Secrets Setup

This action requires the following secrets to be configured in your repository:

### Required Secrets

- `CURITY_CLI_CLIENT_SECRET`: Your OAuth client secret

### Setting up Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each required secret with the appropriate values

## Security Considerations

- ✅ Client secrets are properly masked in GitHub Action logs
- ✅ Access tokens are automatically masked using `core.setSecret()`
- ✅ Settings files are automatically cleaned up after the workflow
- ✅ OAuth follows industry-standard client credentials flow
- ✅ Temporary files are created in runner's temp directory by default

## OAuth Server Requirements

Your OAuth server must support the **client credentials flow** (RFC 6749 Section 4.4) and should:

1. Accept `POST` requests to the token endpoint
2. Support `application/x-www-form-urlencoded` content type
3. Return JSON responses with `access_token` field
4. Accept the following parameters:
   - `grant_type=client_credentials`
   - `client_id=<your-client-id>`
   - `client_secret=<your-client-secret>`
   - `scope=<requested-scope>` (optional)

### Example Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "maven:read maven:write"
}
```

## Generated Maven Settings

The action creates a `settings.xml` file that will mirror ALL repositories that may have
been configured in the pom.xml file, including Maven Central, to the Curity Repository.

This enforces the use of the Curity Repository for all dependencies.

## Error Handling

The action performs comprehensive error checking:

- ✅ Validates Maven is available in the environment
- ✅ Validates all required inputs are provided
- ✅ Handles OAuth server connection issues
- ✅ Validates OAuth server responses
- ✅ Provides detailed error messages for debugging

## Development

### Building the Action

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
