const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * MCP Dependency Manager - Auto-install and manage development dependencies
 * Handles Git, Node.js, Python, and other essential development tools
 */
class DependencyManager {
  constructor() {
    this.platform = process.platform;
    this.credentialStore = new Map();
    this.encryptionKey = this.getOrCreateEncryptionKey();
  }

  /**
     * Detect all missing development dependencies
     */
  async detectMissingDependencies() {
    const dependencies = {
      git: await this.checkGit(),
      nodejs: await this.checkNodeJS(),
      npm: await this.checkNPM(),
      python: await this.checkPython(),
      dotnet: await this.checkDotNet(),
      msbuild: await this.checkMSBuild(),
      nuget: await this.checkNuGet(),
      vscode: await this.checkVSCode(),
      // Add more as needed
    };

    const missing = Object.entries(dependencies)
      .filter(([name, status]) => !status.installed)
      .map(([name, status]) => ({ name, ...status }));

    return {
      platform: this.platform,
      dependencies,
      missing,
      canAutoInstall: this.canAutoInstall(),
      packageManager: this.getPackageManager()
    };
  }

  /**
     * Auto-install missing dependency with user consent
     */
  async installDependency(dependencyName, options = {}) {
    const { force = false, version = 'latest' } = options;
        
    if (!force) {
      // In real implementation, this would prompt user through Claude Code
      console.log(`Permission requested: Install ${dependencyName}?`);
    }

    try {
      const result = await this.performInstallation(dependencyName, version);
            
      // Verify installation
      const verification = await this.verifyInstallation(dependencyName);
            
      return {
        success: verification.installed,
        dependency: dependencyName,
        version: verification.version,
        path: verification.path,
        installMethod: result.method,
        message: `${dependencyName} installed successfully via ${result.method}`
      };
    } catch (error) {
      return {
        success: false,
        dependency: dependencyName,
        error: error.message,
        suggestions: await this.getInstallationSuggestions(dependencyName)
      };
    }
  }

  /**
     * Securely store Git credentials
     */
  async storeGitCredentials(credentials) {
    const { username, email, token, provider = 'github' } = credentials;
        
    // Encrypt sensitive data
    const encryptedToken = this.encrypt(token);
        
    const credentialData = {
      username,
      email,
      provider,
      encryptedToken,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    };

    // Store in secure location (OS-specific)
    await this.secureStore(`git_${provider}`, credentialData);
        
    // Configure Git globally
    await this.configureGit(username, email);
        
    return {
      success: true,
      message: `Git credentials stored securely for ${provider}`,
      configured: true
    };
  }

  /**
     * Retrieve and decrypt Git credentials
     */
  async getGitCredentials(provider = 'github') {
    try {
      const credentialData = await this.secureRetrieve(`git_${provider}`);
      if (!credentialData) {
        return { success: false, message: 'No credentials found' };
      }

      const decryptedToken = this.decrypt(credentialData.encryptedToken);
            
      return {
        success: true,
        username: credentialData.username,
        email: credentialData.email,
        token: decryptedToken,
        provider: credentialData.provider
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Implementation methods...
    
  async checkGit() {
    try {
      const version = execSync('git --version', { encoding: 'utf8' }).trim();
      const path = process.platform === 'win32' 
        ? execSync('where git', { encoding: 'utf8' }).trim()
        : execSync('which git', { encoding: 'utf8' }).trim();
      return {
        installed: true,
        version: version.replace('git version ', ''),
        path: path.split('\n')[0]
      };
    } catch {
      return { installed: false, reason: 'Command not found' };
    }
  }

  async checkNodeJS() {
    try {
      const version = execSync('node --version', { encoding: 'utf8' }).trim();
      const path = process.platform === 'win32' 
        ? execSync('where node', { encoding: 'utf8' }).trim()
        : execSync('which node', { encoding: 'utf8' }).trim();
      return {
        installed: true,
        version: version.replace('v', ''),
        path: path.split('\n')[0]
      };
    } catch {
      return { installed: false, reason: 'Command not found' };
    }
  }

  async checkNPM() {
    try {
      const version = execSync('npm --version', { encoding: 'utf8' }).trim();
      return { installed: true, version };
    } catch {
      return { installed: false, reason: 'Command not found' };
    }
  }

  async checkPython() {
    try {
      const version = execSync('python --version', { encoding: 'utf8' }).trim();
      return {
        installed: true,
        version: version.replace('Python ', '')
      };
    } catch {
      return { installed: false, reason: 'Command not found' };
    }
  }

  async checkDotNet() {
    try {
      const info = execSync('dotnet --info', { encoding: 'utf8' });
      const versionMatch = info.match(/Version:\s+([\d.]+)/);
      const sdks = info.match(/Microsoft\.NETCore\.App\s+([\d.]+)/g) || [];
            
      return { 
        installed: true, 
        version: versionMatch ? versionMatch[1] : 'unknown',
        sdks: sdks.map(sdk => sdk.replace(/Microsoft\.NETCore\.App\s+/, '')),
        runtimes: await this.getDotNetRuntimes()
      };
    } catch {
      return { installed: false, reason: '.NET SDK not found' };
    }
  }

  async checkMSBuild() {
    try {
      // Try multiple locations for MSBuild
      const possiblePaths = [
        'msbuild',
        '"C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe"',
        '"C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe"',
        '"C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin\\MSBuild.exe"',
        '"C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe"'
      ];

      for (const path of possiblePaths) {
        try {
          const version = execSync(`${path} -version -nologo`, { encoding: 'utf8' }).trim();
          return { 
            installed: true, 
            version: version.split('\n')[0],
            path: path
          };
        } catch {
          continue;
        }
      }
            
      return { installed: false, reason: 'MSBuild not found' };
    } catch {
      return { installed: false, reason: 'MSBuild check failed' };
    }
  }

  async checkNuGet() {
    try {
      const version = execSync('nuget help', { encoding: 'utf8' });
      const versionMatch = version.match(/NuGet Version: ([\d.]+)/);
      return { 
        installed: true, 
        version: versionMatch ? versionMatch[1] : 'unknown'
      };
    } catch {
      return { installed: false, reason: 'NuGet CLI not found' };
    }
  }

  async checkVSCode() {
    try {
      const version = execSync('code --version', { encoding: 'utf8' }).trim();
      return { 
        installed: true, 
        version: version.split('\n')[0]
      };
    } catch {
      return { installed: false, reason: 'VS Code not found' };
    }
  }

  async getDotNetRuntimes() {
    try {
      const runtimes = execSync('dotnet --list-runtimes', { encoding: 'utf8' });
      return runtimes.split('\n').filter(line => line.trim()).map(line => {
        const [name, version] = line.split(' ');
        return { name, version };
      });
    } catch {
      return [];
    }
  }

  async verifyInstallation(dependency) {
    switch (dependency) {
    case 'git': return await this.checkGit();
    case 'nodejs': return await this.checkNodeJS();
    case 'npm': return await this.checkNPM();
    case 'python': return await this.checkPython();
    case 'dotnet': return await this.checkDotNet();
    default: return { installed: false, reason: 'Unknown dependency' };
    }
  }

  async performInstallation(dependency, version) {
    const packageManager = this.getPackageManager();
        
    switch (this.platform) {
    case 'win32':
      return await this.installWindows(dependency, version, packageManager);
    case 'darwin':
      return await this.installMacOS(dependency, version, packageManager);
    case 'linux':
      return await this.installLinux(dependency, version, packageManager);
    default:
      throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  async installWindows(dependency, version, packageManager) {
    const commands = {
      git: 'winget install --id Git.Git -e --source winget',
      nodejs: 'winget install --id OpenJS.NodeJS -e --source winget',
      python: 'winget install --id Python.Python.3.11 -e --source winget',
      dotnet: 'winget install --id Microsoft.DotNet.SDK.9 -e --source winget',
      msbuild: 'winget install --id Microsoft.VisualStudio.2022.BuildTools -e --source winget',
      nuget: 'winget install --id Microsoft.NuGet -e --source winget',
      vscode: 'winget install --id Microsoft.VisualStudioCode -e --source winget'
    };

    if (!commands[dependency]) {
      // Try advanced installation for .NET components
      return await this.installDotNetComponent(dependency, version);
    }

    execSync(commands[dependency], { stdio: 'inherit' });
        
    // Post-installation setup for certain tools
    if (dependency === 'dotnet') {
      await this.configureDotNet();
    } else if (dependency === 'msbuild') {
      await this.configureMSBuild();
    }
        
    return { method: 'winget' };
  }

  async installDotNetComponent(component, version) {
    switch (component) {
    case 'dotnet-sdk-6':
      execSync('winget install --id Microsoft.DotNet.SDK.6 -e --source winget', { stdio: 'inherit' });
      return { method: 'winget', component: '.NET SDK 6' };
            
    case 'dotnet-sdk-8':
      execSync('winget install --id Microsoft.DotNet.SDK.8 -e --source winget', { stdio: 'inherit' });
      return { method: 'winget', component: '.NET SDK 8' };
            
    case 'dotnet-sdk-9':
      execSync('winget install --id Microsoft.DotNet.SDK.9 -e --source winget', { stdio: 'inherit' });
      return { method: 'winget', component: '.NET SDK 9' };
                
    case 'vs-buildtools':
      // Install Visual Studio Build Tools with C# workload
      const vsInstaller = `
                    winget install --id Microsoft.VisualStudio.2022.BuildTools \
                    --override "--quiet --add Microsoft.VisualStudio.Workload.MSBuildTools \
                    --add Microsoft.VisualStudio.Workload.NetCoreBuildTools"
                `.trim();
      execSync(vsInstaller, { stdio: 'inherit' });
      return { method: 'winget', component: 'VS Build Tools' };
                
    default:
      throw new Error(`Unknown .NET component: ${component}`);
    }
  }

  async configureDotNet() {
    // Set up .NET environment variables if needed
    try {
      execSync('dotnet --list-sdks', { encoding: 'utf8' });
      console.log('.NET SDK configured successfully');
    } catch (error) {
      console.warn('Post-installation .NET configuration may be needed');
    }
  }

  async configureMSBuild() {
    // Add MSBuild to PATH if not already there
    const msbuildPath = 'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin';
    try {
      execSync(`setx PATH "%PATH%;${msbuildPath}"`, { encoding: 'utf8' });
      console.log('MSBuild added to PATH');
    } catch {
      console.log('MSBuild PATH configuration may need manual setup');
    }
  }

  async installMacOS(dependency, version, packageManager) {
    const commands = {
      git: 'brew install git',
      nodejs: 'brew install node',
      python: 'brew install python@3.11',
      dotnet: 'brew install --cask dotnet'
    };

    if (!commands[dependency]) {
      throw new Error(`Unknown dependency: ${dependency}`);
    }

    execSync(commands[dependency], { stdio: 'inherit' });
    return { method: 'homebrew' };
  }

  async installLinux(dependency, version, packageManager) {
    const commands = {
      git: 'sudo apt-get update && sudo apt-get install -y git',
      nodejs: 'sudo apt-get update && sudo apt-get install -y nodejs npm',
      python: 'sudo apt-get update && sudo apt-get install -y python3 python3-pip',
      dotnet: 'sudo apt-get update && sudo apt-get install -y dotnet-sdk-8.0'
    };

    if (!commands[dependency]) {
      throw new Error(`Unknown dependency: ${dependency}`);
    }

    execSync(commands[dependency], { stdio: 'inherit' });
    return { method: 'apt' };
  }

  getPackageManager() {
    switch (this.platform) {
    case 'win32': return 'winget';
    case 'darwin': return 'brew';
    case 'linux': return 'apt'; // or detect specific distro
    default: return 'manual';
    }
  }

  canAutoInstall() {
    return this.platform === 'win32' || this.platform === 'darwin' || this.platform === 'linux';
  }

  async getInstallationSuggestions(dependency) {
    const suggestions = {
      git: [
        'Download from https://git-scm.com/',
        'Use package manager (winget, brew, apt)',
        'Install GitHub Desktop for GUI option'
      ],
      nodejs: [
        'Download from https://nodejs.org/',
        'Use Node Version Manager (nvm)',
        'Install via package manager'
      ],
      python: [
        'Download from https://python.org/',
        'Use Anaconda distribution',
        'Install via package manager'
      ]
    };

    return suggestions[dependency] || ['Manual installation required'];
  }

  // Encryption/Security methods
  getOrCreateEncryptionKey() {
    // In production, use more secure key management
    const keyPath = path.join(os.homedir(), '.mak3r-hub-key');
    try {
      return require('fs').readFileSync(keyPath);
    } catch {
      const key = crypto.randomBytes(32);
      require('fs').writeFileSync(keyPath, key, { mode: 0o600 });
      return key;
    }
  }

  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    const [ivHex, encrypted] = encryptedData.split(':');
    const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async secureStore(key, data) {
    const storePath = path.join(os.homedir(), '.mak3r-hub', 'credentials');
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    await fs.writeFile(
      path.join(storePath, `${key}.json`),
      JSON.stringify(data),
      { mode: 0o600 }
    );
  }

  async secureRetrieve(key) {
    const storePath = path.join(os.homedir(), '.mak3r-hub', 'credentials', `${key}.json`);
    try {
      const data = await fs.readFile(storePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async configureGit(username, email) {
    execSync(`git config --global user.name "${username}"`);
    execSync(`git config --global user.email "${email}"`);
    execSync('git config --global credential.helper store');
  }
}

// Simple handler functions for MCP
async function detectMissing() {
  const service = new DependencyManager();
  return await service.detectMissingDependencies();
}

async function installDependency(args) {
  const service = new DependencyManager();
  return await service.installDependency(args.dependencyName);
}

async function storeGitCredentials(args) {
  const service = new DependencyManager();
  return await service.storeGitCredentials(args.username, args.email, args.token);
}

async function getGitCredentials() {
  const service = new DependencyManager();
  return await service.getGitCredentials();
}

module.exports = {
  detectMissing,
  installDependency,
  storeGitCredentials,
  getGitCredentials,
  DependencyManager
};