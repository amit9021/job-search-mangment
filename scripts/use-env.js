#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Cross-platform environment loader script
 * Replaces use-env.sh for Node.js/npm scripts to work without bash
 */

// Parse arguments
const args = process.argv.slice(2);
let envName = process.env.NODE_ENV || 'development';
let commandArgs = [...args];

// Check for --env flag
if (args[0] === '--env') {
  if (args.length < 2) {
    console.error('Missing value for --env flag');
    process.exit(1);
  }
  envName = args[1];
  commandArgs = args.slice(2);
}

if (commandArgs.length < 1) {
  console.error('Usage: use-env.js [--env <environment>] <command> [args...]');
  process.exit(1);
}

// Determine paths
const scriptDir = __dirname;
const repoRoot = path.resolve(scriptDir, '..');

// Detect if running in Docker (Docker sets various env vars)
const isDocker = process.env.DOCKER_CONTAINER === 'true' ||
                 fs.existsSync('/.dockerenv') ||
                 process.env.KUBERNETES_SERVICE_HOST !== undefined;

// Find the appropriate .env file (skip in Docker as env vars are injected by docker-compose)
let selectedEnvFile = process.env.ENV_FILE || '';

if (!isDocker) {
  if (!selectedEnvFile) {
    const candidates = [
      path.join(repoRoot, `.env.${envName}.local`),
      path.join(repoRoot, `.env.${envName}`),
      path.join(repoRoot, `.env.local`),
      path.join(repoRoot, `.env`)
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        selectedEnvFile = candidate;
        break;
      }
    }
  }

  if (!selectedEnvFile) {
    console.error(`No env file found for environment '${envName}'.`);
    process.exit(1);
  }

  if (process.env.USE_ENV_VERBOSE === '1') {
    console.error(`Using env file: ${selectedEnvFile}`);
  }

  // Load environment variables from the selected file
  function loadEnvFile(filePath) {
    const envContent = fs.readFileSync(filePath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Parse KEY=VALUE format
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Only set if not already set in environment
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }

  // Load the env file
  loadEnvFile(selectedEnvFile);

  // Set ENV_FILE
  process.env.ENV_FILE = selectedEnvFile;
} else {
  // In Docker: env vars are already injected by docker-compose, just log
  if (process.env.USE_ENV_VERBOSE === '1') {
    console.error(`Running in Docker - using environment variables from docker-compose`);
  }
}

// Always set NODE_ENV
process.env.NODE_ENV = envName;

// Execute the command
const command = commandArgs[0];
const commandArguments = commandArgs.slice(1);

// Determine if command is npm/npx and handle accordingly
const shell = process.platform === 'win32';
const spawned = spawn(command, commandArguments, {
  stdio: 'inherit',
  shell,
  env: process.env
});

spawned.on('exit', (code) => {
  process.exit(code || 0);
});

spawned.on('error', (err) => {
  console.error(`Failed to execute command: ${err.message}`);
  process.exit(1);
});
