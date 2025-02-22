import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface OpenRouterConfig {
  apiKey: string;
}

export interface Config {
  openRouter: OpenRouterConfig;
}

const CONFIG_FILE = path.join(dirname(__dirname), 'config.json');

const defaultConfig: Config = {
  openRouter: {
    apiKey: ''
  }
};

function validateConfig(config: unknown): config is Config {
  if (!config || typeof config !== 'object') return false;
  
  const { openRouter } = config as Config;
  if (!openRouter || typeof openRouter !== 'object') return false;
  
  // Validate required fields
  if (typeof openRouter.apiKey !== 'string') return false;
  
  return true;
}

function ensureConfigDir(): void {
  const configDir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch (error) {
      console.error('Error creating config directory:', error);
      throw new Error('Failed to create config directory');
    }
  }
}

export function loadConfig(): Config {
  try {
    // Ensure config directory exists
    ensureConfigDir();

    // If config doesn't exist, create default
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), { mode: 0o644 });
      return defaultConfig;
    }

    // Read and parse config
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content);

    // Validate config structure
    if (!validateConfig(config)) {
      console.error('Invalid config structure, using default');
      return defaultConfig;
    }

    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) console.error('Stack trace:', error.stack);
    }
    return defaultConfig;
  }
}

export function saveConfig(config: Config): void {
  try {
    // Validate config before saving
    if (!validateConfig(config)) {
      throw new Error('Invalid config structure');
    }

    // Ensure config directory exists
    ensureConfigDir();

    // Save config with proper permissions
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o644 });
  } catch (error) {
    console.error('Error saving config:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

export function getOpenRouterConfig(): OpenRouterConfig {
  // Check environment variable first
  const envApiKey = process.env.OPENROUTER_API_KEY;
  if (envApiKey) {
    return {
      apiKey: envApiKey
    };
  }

  // Fall back to config file
  try {
    const config = loadConfig();
    return config.openRouter;
  } catch (error) {
    console.error('Error getting OpenRouter config:', error);
    return defaultConfig.openRouter;
  }
}

export function updateOpenRouterConfig(openRouter: Partial<OpenRouterConfig>): void {
  // If environment variable is set, warn that it takes precedence
  if (process.env.OPENROUTER_API_KEY) {
    console.warn('Warning: OPENROUTER_API_KEY environment variable is set and will take precedence over config file');
  }

  try {
    const config = loadConfig();
    config.openRouter = { ...config.openRouter, ...openRouter };
    saveConfig(config);
  } catch (error) {
    console.error('Error updating OpenRouter config:', error);
    throw new Error('Failed to update OpenRouter configuration');
  }
}
