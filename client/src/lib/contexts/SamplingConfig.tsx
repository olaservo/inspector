import { useState } from 'react';
import { useEffect } from 'react';
import { SamplingConfig } from 'mcp-sampling-service';

export function SamplingConfigComponent() {
  const [config, setConfig] = useState<SamplingConfig | null>(null);

  useEffect(() => {
    fetch('/api/sampling/strategies')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(error => console.error('Error fetching sampling config:', error));
  }, []);

  // Render the component that uses the config state directly
  return (
    <div>
      {config ? (
        <div>
          <h2>Sampling Configuration</h2>
          <pre>{JSON.stringify(config, null, 2)}</pre>
        </div>
      ) : (
        <p>Loading configuration...</p>
      )}
    </div>
  );
}
