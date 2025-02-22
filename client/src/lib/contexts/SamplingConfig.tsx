import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

interface OpenRouterConfig {
  hasApiKey: boolean;
  isEnvVar: boolean;
}

export function SamplingConfigComponent() {
  const [openRouterConfig, setOpenRouterConfig] = useState<OpenRouterConfig | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:3000/api/config/openrouter');
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        // Get response text first to log raw response
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch configuration: ${responseText}`);
        }

        // Now parse the text as JSON
        const data = JSON.parse(responseText);
        setOpenRouterConfig(data);
      } catch (err) {
        console.error('Error fetching OpenRouter config:', err);
        const message = err instanceof Error ? err.message : 'Failed to load configuration';
        setError(`Configuration Error: ${message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('http://localhost:3000/api/config/openrouter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey || undefined
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save configuration');
      }

      // Clear API key input after successful save
      setApiKey('');
      
      // Refresh OpenRouter config
      const updatedConfig = await fetch('http://localhost:3000/api/config/openrouter').then(res => res.json());
      setOpenRouterConfig(updatedConfig);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      let details = '';
      
      // Try to parse error response from server
      if (err instanceof Error && 'cause' in err) {
        try {
          const responseData = JSON.parse((err.cause as Error).message);
          if (responseData.details) {
            details = responseData.details;
          }
        } catch {
          // If parsing fails, use the original error message
        }
      }
      
      setError(details || errorMessage);
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
                disabled={openRouterConfig?.isEnvVar}
              />
            </label>
            {openRouterConfig?.isEnvVar && (
              <div className="text-sm text-blue-600">
                Using API key from environment variable (OPENROUTER_API_KEY)
              </div>
            )}
          </div>


          {error && (
            <div className="text-red-500 text-sm mb-4">{error}</div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || loading || openRouterConfig?.isEnvVar}
          >
            {saving ? 'Saving...' : loading ? 'Loading...' : 'Save Settings'}
          </Button>
          {openRouterConfig?.isEnvVar && (
            <div className="text-sm text-gray-600">
              API key configuration is disabled because it is set via environment variable
            </div>
          )}

          {loading && (
            <div className="text-sm text-gray-500">Loading configuration...</div>
          )}
        </div>
      </div>
    </div>
  );
}
