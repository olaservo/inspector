import React, { useState } from 'react';
import { SamplingConfig, defaultSamplingConfig } from '@/config/sampling';
import { SamplingConfigContext } from './useSamplingConfig';

export function SamplingConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SamplingConfig>(defaultSamplingConfig);

  return (
    <SamplingConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </SamplingConfigContext.Provider>
  );
}
