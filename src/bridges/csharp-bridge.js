/**
 * C# Extension Bridge - IPC communication with MAK3R.Core.exe
 * Handles JSON-over-stdin/stdout protocol for C# MCP extensions
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const path = require('path');
const fs = require('fs');

class CSharpExtensionBridge extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.options = {
            executablePath: options.executablePath || this._getDefaultExecutablePath(),
            timeout: options.timeout || 30000,
            maxRetries: options.maxRetries || 3,
            enableLogging: options.enableLogging || false,
            ...options
        };
        
        this.process = null;
        this.isStarted = false;
        this.isReady = false;
        this.pendingRequests = new Map();
        this.requestId = 0;
        this.retryCount = 0;
        this.buffer = '';
    }

    /**
     * Start the C# MCP host process
     */
    async start() {
        if (this.isStarted) {
            throw new Error('C# bridge already started');
        }

        try {
            await this._validateExecutable();
            await this._spawnProcess();
            await this._waitForReady();
            
            this.isStarted = true;
            this.emit('started');
            this._log('C# extension bridge started successfully');
            
        } catch (error) {
            this._log(`Failed to start C# bridge: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Stop the C# MCP host process
     */
    async stop() {
        if (!this.isStarted) {
            return;
        }

        try {
            // Cancel all pending requests
            for (const [requestId, request] of this.pendingRequests) {
                request.reject(new Error('C# bridge stopping'));
            }
            this.pendingRequests.clear();

            // Gracefully stop the process
            if (this.process && !this.process.killed) {
                this.process.kill('SIGTERM');
                
                // Force kill if it doesn't stop gracefully
                setTimeout(() => {
                    if (this.process && !this.process.killed) {
                        this.process.kill('SIGKILL');
                    }
                }, 5000);
            }

            this.isStarted = false;
            this.isReady = false;
            this.process = null;
            
            this.emit('stopped');
            this._log('C# extension bridge stopped');
            
        } catch (error) {
            this._log(`Error stopping C# bridge: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Discover available C# extensions
     */
    async discoverExtensions() {
        return this._sendRequest('discover-extensions', {
            extensionPath: './src-csharp/extensions'
        });
    }

    /**
     * Execute a tool from a C# extension
     */
    async executeTool(extensionName, toolName, parameters = {}) {
        return this._sendRequest('execute-tool', {
            extensionName,
            toolName,
            arguments: parameters,
            timeout: this.options.timeout / 1000
        });
    }

    /**
     * Check health of a C# extension
     */
    async checkExtensionHealth(extensionName) {
        return this._sendRequest('health-check', {
            extensionName
        });
    }

    /**
     * Send a request to the C# MCP host
     * @private
     */
    async _sendRequest(command, parameters = {}) {
        if (!this.isReady) {
            throw new Error('C# bridge not ready');
        }

        const requestId = `req-${++this.requestId}`;
        const request = {
            id: requestId,
            type: 'request',
            timestamp: new Date().toISOString(),
            payload: {
                command,
                parameters
            }
        };

        return new Promise((resolve, reject) => {
            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(requestId);
                reject(new Error(`Request timeout: ${command}`));
            }, this.options.timeout);

            // Store request context
            this.pendingRequests.set(requestId, {
                resolve: (response) => {
                    clearTimeout(timeout);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                },
                command,
                timeout
            });

            // Send request to C# process
            try {
                const requestJson = JSON.stringify(request);
                this._log(`Sending request: ${command}`, 'debug');
                this.process.stdin.write(requestJson + '\n');
            } catch (error) {
                this.pendingRequests.delete(requestId);
                clearTimeout(timeout);
                reject(new Error(`Failed to send request: ${error.message}`));
            }
        });
    }

    /**
     * Get default path to MAK3R.Core.exe
     * @private
     */
    _getDefaultExecutablePath() {
        const baseDir = path.resolve(__dirname, '../../src-csharp/MAK3R.Core');
        const candidates = [
            path.join(baseDir, 'bin/Release/net9.0/win-x64/MAK3R.Core.exe'),
            path.join(baseDir, 'bin/Debug/net9.0/win-x64/MAK3R.Core.exe'),
            path.join(baseDir, 'bin/Release/net9.0/MAK3R.Core.exe'),
            path.join(baseDir, 'bin/Debug/net9.0/MAK3R.Core.exe')
        ];

        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                return candidate;
            }
        }

        // Default to Release build
        return candidates[0];
    }

    /**
     * Validate that the C# executable exists
     * @private
     */
    async _validateExecutable() {
        if (!fs.existsSync(this.options.executablePath)) {
            throw new Error(`MAK3R.Core.exe not found at: ${this.options.executablePath}`);
        }
    }

    /**
     * Spawn the C# MCP host process
     * @private
     */
    async _spawnProcess() {
        return new Promise((resolve, reject) => {
            try {
                this.process = spawn(this.options.executablePath, ['mcp-host'], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: path.dirname(this.options.executablePath)
                });

                // Set up event handlers
                this.process.on('error', (error) => {
                    this._log(`C# process error: ${error.message}`, 'error');
                    this.emit('error', error);
                    reject(error);
                });

                this.process.on('exit', (code) => {
                    this._log(`C# process exited with code: ${code}`);
                    this.isReady = false;
                    this.isStarted = false;
                    this.emit('exit', code);
                });

                // Handle stdout (responses from C#)
                this.process.stdout.on('data', (data) => {
                    this._handleStdoutData(data);
                });

                // Handle stderr (logs from C#)
                this.process.stderr.on('data', (data) => {
                    const message = data.toString().trim();
                    if (message) {
                        this._log(`C# stderr: ${message}`, 'debug');
                    }
                });

                this.process.stdin.on('error', (error) => {
                    this._log(`Stdin error: ${error.message}`, 'error');
                });

                resolve();
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Wait for the ready signal from C# host
     * @private
     */
    async _waitForReady() {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('C# host ready timeout'));
            }, 10000);

            const onMessage = (message) => {
                if (message.type === 'event' && message.payload?.event === 'mcp-host-ready') {
                    clearTimeout(timeout);
                    this.isReady = true;
                    this._log(`C# host ready with ${message.payload.extensionCount} extensions`);
                    resolve();
                }
            };

            this.once('message', onMessage);
        });
    }

    /**
     * Handle stdout data from C# process
     * @private
     */
    _handleStdoutData(data) {
        this.buffer += data.toString();
        
        // Process complete JSON lines
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                try {
                    const message = JSON.parse(trimmed);
                    this._handleMessage(message);
                } catch (error) {
                    this._log(`Failed to parse C# message: ${error.message} - Line: ${trimmed}`, 'error');
                }
            }
        }
    }

    /**
     * Handle parsed message from C# host
     * @private
     */
    _handleMessage(message) {
        this._log(`Received message: ${message.type} - ${message.id}`, 'debug');
        
        if (message.type === 'response') {
            // Handle response to a request
            const pendingRequest = this.pendingRequests.get(message.id);
            if (pendingRequest) {
                this.pendingRequests.delete(message.id);
                
                if (message.payload?.success) {
                    pendingRequest.resolve(message.payload.data);
                } else {
                    const error = new Error(message.payload?.error || 'C# execution failed');
                    error.code = message.payload?.errorCode;
                    pendingRequest.reject(error);
                }
            }
        } else if (message.type === 'event') {
            // Handle event from C# host
            this.emit('message', message);
            this.emit('csharp-event', message.payload);
        }
    }

    /**
     * Log message with optional level
     * @private
     */
    _log(message, level = 'info') {
        if (this.options.enableLogging) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [CSharpBridge] [${level.toUpperCase()}] ${message}`);
        }
        
        // Always emit log events for external handlers
        this.emit('log', { message, level, timestamp: new Date() });
    }

    /**
     * Get bridge status information
     */
    getStatus() {
        return {
            isStarted: this.isStarted,
            isReady: this.isReady,
            processId: this.process?.pid,
            pendingRequests: this.pendingRequests.size,
            executablePath: this.options.executablePath
        };
    }
}

module.exports = { CSharpExtensionBridge };