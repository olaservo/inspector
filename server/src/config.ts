import fs from 'fs';
import path from 'path';

interface OpenRouterConfig {
  apiKey: string;
  defaultModel: string;
}

export interface Config {
  openRouter: OpenRouterConfig;
}

const CONFIG_FILE = path.join(process.cwd(), 'config.json');

const defaultConfig: Config = {
  openRouter: {
    apiKey: '',
    defaultModel: 'anthropic/claude-3.5-sonnet'
  }
};

export function loadConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      return defaultConfig;
    }
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    return defaultConfig;
  }
}

export function saveConfig(config: Config): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

export function getOpenRouterConfig(): OpenRouterConfig {
  const config = loadConfig();
  return config.openRouter;
}

export function updateOpenRouterConfig(openRouter: Partial<OpenRouterConfig>): void {
  const config = loadConfig();
  config.openRouter = { ...config.openRouter, ...openRouter };
  saveConfig(config);
}
