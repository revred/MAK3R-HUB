const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * MCP C# Build Manager - Complete C# development automation
 * Handles project creation, building, NuGet packages, and publishing
 */
class CSharpBuilder {
  constructor() {
    this.platform = process.platform;
    this.dotnetPath = null;
    this.msbuildPath = null;
    this.initialized = false;
  }

  /**
     * Initialize and verify C# toolchain
     */
  async initialize() {
    if (this.initialized) return true;

    try {
      // Verify .NET SDK
      const dotnetVersion = execSync('dotnet --version', { encoding: 'utf8' }).trim();
      this.dotnetPath = 'dotnet';
            
      // Find MSBuild
      this.msbuildPath = await this.findMSBuild();
            
      this.initialized = true;
      return {
        success: true,
        dotnet: dotnetVersion,
        msbuild: this.msbuildPath ? 'Found' : 'Not found (using dotnet build)'
      };
    } catch (error) {
      return {
        success: false,
        error: 'C# toolchain not initialized',
        suggestion: 'Run m3r__deps__install_dependency with dependencyName: "dotnet"'
      };
    }
  }

  /**
     * Create new C# project
     */
  async createProject(options) {
    const { 
      name, 
      type = 'console',  // console, classlib, webapi, blazor, etc.
      framework = 'net9.0',
      outputPath = '.',
      additionalPackages = []
    } = options;

    await this.initialize();

    try {
      const projectPath = path.join(outputPath, name);
            
      // Create project
      execSync(`dotnet new ${type} -n ${name} -f ${framework} -o "${projectPath}"`, {
        stdio: 'inherit'
      });

      // Add common packages
      if (additionalPackages.length > 0) {
        for (const pkg of additionalPackages) {
          await this.addNuGetPackage({ 
            projectPath, 
            packageName: pkg.name, 
            version: pkg.version 
          });
        }
      }

      // Generate optimized .csproj settings
      await this.optimizeProjectFile(projectPath, name, type);

      return {
        success: true,
        projectPath,
        message: `C# ${type} project created successfully`,
        nextSteps: [
          `cd ${projectPath}`,
          'dotnet restore',
          'dotnet build',
          'dotnet run'
        ]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Build C# project
     */
  async buildProject(options) {
    const { 
      projectPath, 
      configuration = 'Release',
      runtime = null,  // win-x64, linux-x64, osx-x64, etc.
      selfContained = false,
      singleFile = false,
      trimmed = false
    } = options;

    await this.initialize();

    try {
      let buildCommand = `dotnet build "${projectPath}" -c ${configuration}`;
            
      if (runtime) {
        buildCommand += ` -r ${runtime}`;
        if (selfContained) buildCommand += ' --self-contained';
      }

      const result = execSync(buildCommand, { encoding: 'utf8' });

      return {
        success: true,
        configuration,
        runtime: runtime || 'framework-dependent',
        output: result,
        outputPath: path.join(projectPath, 'bin', configuration, runtime || 'net9.0')
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Check for compilation errors in the project'
      };
    }
  }

  /**
     * Publish C# project for deployment
     */
  async publishProject(options) {
    const { 
      projectPath,
      configuration = 'Release',
      runtime = 'win-x64',
      selfContained = true,
      singleFile = true,
      trimmed = true,
      outputPath = null
    } = options;

    await this.initialize();

    try {
      let publishCommand = `dotnet publish "${projectPath}" -c ${configuration} -r ${runtime}`;
            
      if (selfContained) publishCommand += ' --self-contained';
      if (singleFile) publishCommand += ' -p:PublishSingleFile=true';
      if (trimmed) publishCommand += ' -p:PublishTrimmed=true';
      if (outputPath) publishCommand += ` -o "${outputPath}"`;

      const result = execSync(publishCommand, { encoding: 'utf8' });

      const finalOutputPath = outputPath || 
                path.join(projectPath, 'bin', configuration, runtime, 'publish');

      return {
        success: true,
        configuration,
        runtime,
        features: {
          selfContained,
          singleFile,
          trimmed
        },
        outputPath: finalOutputPath,
        message: 'Project published successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Manage NuGet packages
     */
  async addNuGetPackage(options) {
    const { projectPath, packageName, version = '' } = options;

    try {
      let command = `dotnet add "${projectPath}" package ${packageName}`;
      if (version) command += ` --version ${version}`;

      execSync(command, { stdio: 'inherit' });

      return {
        success: true,
        package: packageName,
        version: version || 'latest',
        message: `Package ${packageName} added successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Run C# tests
     */
  async runTests(options) {
    const { projectPath, filter = '', verbosity = 'normal' } = options;

    try {
      let testCommand = `dotnet test "${projectPath}" --verbosity ${verbosity}`;
      if (filter) testCommand += ` --filter "${filter}"`;

      const result = execSync(testCommand, { encoding: 'utf8' });

      // Parse test results
      const passedMatch = result.match(/Passed:\s+(\d+)/);
      const failedMatch = result.match(/Failed:\s+(\d+)/);
      const skippedMatch = result.match(/Skipped:\s+(\d+)/);

      return {
        success: !failedMatch || failedMatch[1] === '0',
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        output: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Create solution and manage projects
     */
  async createSolution(options) {
    const { name, outputPath = '.' } = options;

    try {
      const solutionPath = path.join(outputPath, `${name}.sln`);
      execSync(`dotnet new sln -n ${name} -o "${outputPath}"`, { stdio: 'inherit' });

      return {
        success: true,
        solutionPath,
        message: `Solution ${name} created successfully`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async addProjectToSolution(options) {
    const { solutionPath, projectPath } = options;

    try {
      execSync(`dotnet sln "${solutionPath}" add "${projectPath}"`, { stdio: 'inherit' });

      return {
        success: true,
        message: 'Project added to solution successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
     * Helper methods
     */
  async findMSBuild() {
    const possiblePaths = [
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin\\MSBuild.exe',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin\\MSBuild.exe',
      'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe'
    ];

    for (const path of possiblePaths) {
      try {
        await fs.access(path);
        return path;
      } catch {
        continue;
      }
    }

    return null;
  }

  async optimizeProjectFile(projectPath, projectName, projectType) {
    const csprojPath = path.join(projectPath, `${projectName}.csproj`);
        
    try {
      let csprojContent = await fs.readFile(csprojPath, 'utf8');
            
      // Add optimization settings based on project type
      const optimizations = `
    <!-- MAK3R-HUB Optimizations -->
    <PropertyGroup Condition="'$(Configuration)' == 'Release'">
      <DebugType>none</DebugType>
      <DebugSymbols>false</DebugSymbols>
      <PublishSingleFile>true</PublishSingleFile>
      <SelfContained>true</SelfContained>
      <PublishTrimmed>true</PublishTrimmed>
      <TrimMode>link</TrimMode>
      <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
    </PropertyGroup>`;

      // Insert optimizations before closing </Project> tag
      csprojContent = csprojContent.replace('</Project>', `${optimizations}\n</Project>`);
            
      await fs.writeFile(csprojPath, csprojContent, 'utf8');
    } catch (error) {
      console.warn('Could not optimize project file:', error.message);
    }
  }

  /**
     * Get available project templates
     */
  async getProjectTemplates() {
    try {
      const templates = execSync('dotnet new list', { encoding: 'utf8' });
            
      // Parse templates
      const lines = templates.split('\n').slice(2); // Skip header
      const templateList = [];
            
      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split(/\s{2,}/);
          if (parts.length >= 3) {
            templateList.push({
              name: parts[0].trim(),
              shortName: parts[1].trim(),
              language: parts[2].trim()
            });
          }
        }
      }

      return {
        success: true,
        templates: templateList.filter(t => t.language.includes('C#'))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Simple handler functions for MCP
async function createProject(args) {
  const service = new CSharpBuilder();
  return await service.createProject(args.projectName, args.projectType, args.targetFramework);
}

async function buildProject(args) {
  const service = new CSharpBuilder();
  return await service.buildProject(args.projectPath, args.configuration);
}

async function publishProject(args) {
  const service = new CSharpBuilder();
  return await service.publishProject(args.projectPath, args.runtime, args.selfContained);
}

module.exports = {
  createProject,
  buildProject,
  publishProject,
  CSharpBuilder
};