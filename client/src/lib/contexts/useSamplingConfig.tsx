import { createContext, useContext } from 'react';
import { SamplingConfig } from '@/config/sampling';

interface SamplingConfigContextType {
  config: SamplingConfig;
  setConfig: (config: SamplingConfig) => void;
}

export const SamplingConfigContext = createContext<SamplingConfigContextType | undefined>(undefined);

export function useSamplingConfig() {
  const context = useContext(SamplingConfigContext);
  if (!context) {
    throw new Error('useSamplingConfig must be used within a SamplingConfigProvider');
  }
  return context;
}
