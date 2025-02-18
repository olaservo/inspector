import { useState, useEffect } from 'react';
import { SamplingConfig, ModelConfig } from 'mcp-sampling-service';
import JsonEditor from '../../components/JsonEditor';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface OpenRouterConfig {
  defaultModel: string;
  hasApiKey: boolean;
  allowedModels?: ModelConfig[];
}

export function SamplingConfigComponent() {
  const [strategies, setStrategies] = useState<SamplingConfig | null>(null);
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
  const [allowedModels, setAllowedModels] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch sampling strategies
    fetch('/api/sampling/strategies')
      .then(res => res.json())
      .then(data => setStrategies(data))
      .catch(error => console.error('Error fetching sampling strategies:', error));

    // Fetch OpenRouter config
    fetch('/api/config/openrouter')
      .then(res => res.json())
      .then(data => {
        setOpenRouterConfig(data);
        setDefaultModel(data.defaultModel);
        setAllowedModels(JSON.stringify(data.allowedModels || [], null, 2));
      })
      .catch(error => console.error('Error fetching OpenRouter config:', error));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate allowedModels JSON
      let parsedAllowedModels: ModelConfig[] | undefined;
      if (allowedModels.trim()) {
        try {
          parsedAllowedModels = JSON.parse(allowedModels);
          if (!Array.isArray(parsedAllowedModels)) {
            throw new Error('Allowed models must be an array');
          }
          // Validate each model
          for (const model of parsedAllowedModels) {
            if (!model.id || typeof model.id !== 'string') {
              throw new Error('Each model must have a string id');
            }
            for (const score of ['speedScore', 'intelligenceScore', 'costScore'] as const) {
              const value = model[score];
              if (typeof value !== 'number' || value < 0 || value > 1) {
                throw new Error(`${score} must be a number between 0 and 1`);
              }
            }
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Invalid JSON format';
          throw new Error(`Invalid allowed models format: ${message}`);
        }
      }

      const response = await fetch('/api/config/openrouter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          defaultModel: defaultModel || undefined,
          allowedModels: parsedAllowedModels,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save configuration');
      }

      // Clear API key input after successful save
      setApiKey('');
      
      // Refresh OpenRouter config
      const updatedConfig = await fetch('/api/config/openrouter').then(res => res.json());
      setOpenRouterConfig(updatedConfig);
      setDefaultModel(updatedConfig.defaultModel);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        
        {/* OpenRouter Configuration */}
        <div className="space-y-4">
          <h3 className="text-md font-medium">OpenRouter Settings</h3>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              API Key
              <Input
                type="password"
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                placeholder={openRouterConfig?.hasApiKey ? '••••••••••••••••••••••••' : 'Enter API key'}
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Default Model (Optional)
              <Input
                type="text"
                value={defaultModel}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDefaultModel(e.target.value)}
                placeholder="anthropic/claude-3.5-sonnet"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Allowed Models (Optional)
              <div className="mt-1 min-h-[12rem]">
              <p className="text-sm text-gray-500 mt-1">
                JSON array of models with scores (0-1) for speed, intelligence, and cost
              </p>
                <JsonEditor
                  value={allowedModels}
                  onChange={setAllowedModels}
                  placeholder={`[
  {
    "id": "anthropic/claude-3.5-sonnet",
    "speedScore": 0.65,
    "intelligenceScore": 0.75,
    "costScore": 0.70
  }
]`}
                />
              </div>
              
            </label>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
