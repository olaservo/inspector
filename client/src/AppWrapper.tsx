import { SamplingConfigProvider } from "./lib/contexts/SamplingConfig";
import App from "./App";

export function AppWrapper() {
  return (
    <SamplingConfigProvider>
      <App />
    </SamplingConfigProvider>
  );
}
