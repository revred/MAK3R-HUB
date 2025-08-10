const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

class ExtensionManager {
  constructor() {
    this.extensionsDir = path.join(__dirname, '..', 'tools');
    this.version = require('../package.json').version;
  }

  async listExtensions() {
    try {
      await fs.ensureDir(this.extensionsDir);
      const entries = await fs.readdir(this.extensionsDir);
      const extensions = [];

      for (const entry of entries) {
        const entryPath = path.join(this.extensionsDir, entry);
        const stat = await fs.stat(entryPath);
        
        if (stat.isDirectory()) {
          const extensionInfo = await this.getExtensionInfo(entry);
          if (extensionInfo) {
            extensions.push(extensionInfo);
          }
        }
      }

      return extensions;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to list extensions: ${error.message}`));
      return [];
    }
  }

  async getExtensionInfo(extensionName) {
    try {
      const extensionDir = path.join(this.extensionsDir, extensionName);
      const manifestPath = path.join(extensionDir, 'extension.json');

      if (!await fs.pathExists(manifestPath)) {
        // Create a basic manifest for directories without one
        return {
          name: extensionName,
          version: '1.0.0',
          description: `Extension: ${extensionName}`,
          platform: 'any',
          mounted: await this.isExtensionMounted(extensionName),
          capabilities: [],
          commands: {}
        };
      }

      const manifest = await fs.readJson(manifestPath);
      manifest.mounted = await this.isExtensionMounted(extensionName);
      
      return manifest;
    } catch (error) {
      console.error(chalk.yellow(`⚠️  Failed to read extension info for ${extensionName}: ${error.message}`));
      return null;
    }
  }

  async isExtensionMounted(extensionName) {
    // Check if extension is mounted by looking for symlinks or mount indicators
    // This is a simple implementation - in a real system, you might have a registry
    try {
      const projectRoot = path.join(__dirname, '..');
      const possibleMountPoints = [
        path.join(projectRoot, 'batch-ops', `${extensionName}.exe`),
        path.join(projectRoot, 'scripts', `${extensionName}.sh`),
        path.join(projectRoot, 'mounted-extensions', extensionName)
      ];

      for (const mountPoint of possibleMountPoints) {
        if (await fs.pathExists(mountPoint)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async mount(extensionName) {
    try {
      const extensionInfo = await this.getExtensionInfo(extensionName);
      if (!extensionInfo) {
        return {
          success: false,
          error: `Extension ${extensionName} not found`
        };
      }

      // Check platform compatibility
      if (extensionInfo.platform && extensionInfo.platform !== 'any' && extensionInfo.platform !== os.platform()) {
        return {
          success: false,
          error: `Extension ${extensionName} requires platform ${extensionInfo.platform}, but current platform is ${os.platform()}`
        };
      }

      if (extensionInfo.mounted) {
        return {
          success: true,
          message: `Extension ${extensionName} is already mounted`
        };
      }

      // Perform the mount operation
      const mountResult = await this.performMount(extensionName, extensionInfo);
      return mountResult;

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async performMount(extensionName, extensionInfo) {
    const extensionDir = path.join(this.extensionsDir, extensionName);
    const projectRoot = path.join(__dirname, '..');
    const symlinks = [];

    try {
      // Create mount points based on extension type
      if (extensionName === 'sharpet') {
        // Special handling for sharpet extension
        await this.mountSharpetExtension(extensionDir, projectRoot, symlinks);
      } else {
        // Generic mounting
        await this.mountGenericExtension(extensionName, extensionDir, projectRoot, symlinks);
      }

      return {
        success: true,
        symlinks: symlinks
      };

    } catch (error) {
      // Clean up any partial mounts
      await this.cleanupPartialMount(symlinks);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async mountSharpetExtension(extensionDir, projectRoot, symlinks) {
    // Look for sharpUtilityGUI.exe in the extension
    const possibleExecutables = [
      path.join(extensionDir, 'sharpUtilityGUI.exe'),
      path.join(extensionDir, 'bin', 'sharpUtilityGUI.exe'),
      path.join(extensionDir, 'bin', 'Release', 'sharpUtilityGUI.exe')
    ];

    let executablePath = null;
    for (const exePath of possibleExecutables) {
      if (await fs.pathExists(exePath)) {
        executablePath = exePath;
        break;
      }
    }

    if (!executablePath) {
      throw new Error('sharpUtilityGUI.exe not found in sharpet extension');
    }

    // Create batch-ops directory and symlink
    const batchOpsDir = path.join(projectRoot, 'batch-ops');
    await fs.ensureDir(batchOpsDir);

    const symlinkTarget = path.join(batchOpsDir, 'sharpUtilityGUI.exe');
    
    // Remove existing symlink if it exists
    if (await fs.pathExists(symlinkTarget)) {
      await fs.remove(symlinkTarget);
    }

    // Create symlink (on Windows, this might require admin rights, so we'll copy instead)
    if (os.platform() === 'win32') {
      await fs.copy(executablePath, symlinkTarget);
      symlinks.push({
        from: executablePath,
        to: symlinkTarget,
        type: 'copy'
      });
    } else {
      await fs.ensureSymlink(executablePath, symlinkTarget);
      symlinks.push({
        from: executablePath,
        to: symlinkTarget,
        type: 'symlink'
      });
    }
  }

  async mountGenericExtension(extensionName, extensionDir, projectRoot, symlinks) {
    // Generic mounting logic
    const mountedExtensionsDir = path.join(projectRoot, 'mounted-extensions');
    await fs.ensureDir(mountedExtensionsDir);

    const mountPoint = path.join(mountedExtensionsDir, extensionName);
    
    if (os.platform() === 'win32') {
      await fs.copy(extensionDir, mountPoint);
      symlinks.push({
        from: extensionDir,
        to: mountPoint,
        type: 'copy'
      });
    } else {
      await fs.ensureSymlink(extensionDir, mountPoint);
      symlinks.push({
        from: extensionDir,
        to: mountPoint,
        type: 'symlink'
      });
    }
  }

  async unmount(extensionName) {
    try {
      const extensionInfo = await this.getExtensionInfo(extensionName);
      if (!extensionInfo) {
        return {
          success: false,
          error: `Extension ${extensionName} not found`
        };
      }

      if (!extensionInfo.mounted) {
        return {
          success: true,
          message: `Extension ${extensionName} is not mounted`
        };
      }

      // Perform the unmount operation
      await this.performUnmount(extensionName);

      return {
        success: true
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async performUnmount(extensionName) {
    const projectRoot = path.join(__dirname, '..');
    
    // Remove possible mount points
    const possibleMountPoints = [
      path.join(projectRoot, 'batch-ops', `${extensionName}.exe`),
      path.join(projectRoot, 'batch-ops', `${extensionName}GUI.exe`),
      path.join(projectRoot, 'scripts', `${extensionName}.sh`),
      path.join(projectRoot, 'mounted-extensions', extensionName)
    ];

    for (const mountPoint of possibleMountPoints) {
      if (await fs.pathExists(mountPoint)) {
        await fs.remove(mountPoint);
      }
    }

    // Special handling for sharpet
    if (extensionName === 'sharpet') {
      const sharpUtilityPath = path.join(projectRoot, 'batch-ops', 'sharpUtilityGUI.exe');
      if (await fs.pathExists(sharpUtilityPath)) {
        await fs.remove(sharpUtilityPath);
      }
    }
  }

  async cleanupPartialMount(symlinks) {
    for (const symlink of symlinks) {
      try {
        if (await fs.pathExists(symlink.to)) {
          await fs.remove(symlink.to);
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  async execute(extensionName, command) {
    try {
      const extensionInfo = await this.getExtensionInfo(extensionName);
      if (!extensionInfo) {
        return {
          success: false,
          error: `Extension ${extensionName} not found`
        };
      }

      if (!extensionInfo.mounted) {
        return {
          success: false,
          error: `Extension ${extensionName} is not mounted. Mount it first with: mak3r-hub ext mount ${extensionName}`
        };
      }

      // Execute the command on the extension
      const result = await this.executeExtensionCommand(extensionName, command);
      return result;

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executeExtensionCommand(extensionName, command) {
    const { spawn } = require('child_process');
    const projectRoot = path.join(__dirname, '..');

    return new Promise((resolve, reject) => {
      let executable;
      let args;

      if (extensionName === 'sharpet') {
        executable = path.join(projectRoot, 'batch-ops', 'sharpUtilityGUI.exe');
        args = [command];
      } else {
        // Generic extension execution
        executable = path.join(projectRoot, 'mounted-extensions', extensionName, 'main');
        args = [command];
      }

      const child = spawn(executable, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: os.platform() === 'win32'
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({
            success: true,
            output: output
          });
        } else {
          resolve({
            success: false,
            error: errorOutput || `Command failed with exit code ${code}`
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to execute command: ${error.message}`
        });
      });
    });
  }
}

module.exports = ExtensionManager;