import { useState, useEffect } from 'react';
import { SamplingConfig } from 'mcp-sampling-service';

interface OpenRouterConfig {
  defaultModel: string;
  hasApiKey: boolean;
}

export function SamplingConfigComponent() {
  const [strategies, setStrategies] = useState<SamplingConfig | null>(null);
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('');
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
      })
      .catch(error => console.error('Error fetching OpenRouter config:', error));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/config/openrouter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey || undefined,
          defaultModel: defaultModel || undefined,
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
        <h2 className="text-lg font-medium mb-4">Sampling Configuration</h2>
        
        {/* OpenRouter Configuration */}
        <div className="space-y-4">
          <h3 className="text-md font-medium">OpenRouter Settings</h3>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              API Key
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={openRouterConfig?.hasApiKey ? '••••••••' : 'Enter API key'}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Default Model
              <input
                type="text"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="anthropic/claude-3.5-sonnet"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Display Sampling Strategies */}
        {strategies && (
          <div className="mt-6">
            <h3 className="text-md font-medium mb-2">Available Strategies</h3>
            <pre className="bg-gray-100 p-4 rounded">
              {JSON.stringify(strategies, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
