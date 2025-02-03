import { Alert, AlertDescription } from "@/components/ui/alert";
import { SamplingConfigComponent } from "../lib/contexts/SamplingConfig";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { CreateMessageResult } from "@modelcontextprotocol/sdk/types.js";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { SamplingStrategyDefinition } from "mcp-sampling-service";
import { z } from "zod";
import { useState, useEffect } from "react";
import ErrorDisplay from "./ErrorDisplay";

interface SamplingConfig {
  strategy: string;
  config: Record<string, string | number | boolean>;
}

export type PendingRequest = {
  id: number;
  request: z.infer<typeof CreateMessageRequestSchema>;
};

export type Props = {
  pendingRequests: PendingRequest[];
  onApprove: (id: number, result: CreateMessageResult) => void;
  onReject: (id: number) => void;
};

const SamplingTab = ({ pendingRequests, onApprove, onReject }: Props) => {
  const [strategies, setStrategies] = useState<SamplingStrategyDefinition[]>([]);
  const [config, setConfig] = useState<SamplingConfig>({
    strategy: "stub",
    config: {}
  });
  const selectedStrategy = strategies.find(s => s.id === config.strategy);

  useEffect(() => {
    fetch("http://localhost:3000/api/sampling/strategies")
      .then(res => res.json())
      .then(data => setStrategies(data))
      .catch(error => {
        console.error("Error fetching sampling strategies:", error);
        setError(error);
      });
  }, []);
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    Object.fromEntries(
      selectedStrategy?.configFields?.map(field => [field.name, (config.config[field.name] as string) || '']) || []
    )
  );

  const handleStrategyChange = (value: string) => {
    setError(null);
    setConfig({
      strategy: value,
      config: {}
    });
    setConfigValues({});
  };

  const handleConfigChange = (field: string, value: string) => {
    setError(null);
    const newValues = { ...configValues, [field]: value };
    setConfigValues(newValues);
    setConfig({
      ...config,
      config: newValues
    });
  };

  const [error, setError] = useState<unknown>(null);
  const [processingRequests, setProcessingRequests] = useState<Set<number>>(new Set());

  const handleReject = (id: number) => {
    setProcessingRequests(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setError(null);
    onReject(id);
  };

  const handleApprove = async (id: number, request: z.infer<typeof CreateMessageRequestSchema>) => {
    setError(null);
    setProcessingRequests(prev => new Set([...prev, id]));
    
    try {
      const response = await fetch("http://localhost:3000/api/sampling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategy: config.strategy,
          config: config.config,
          request
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      // Call onApprove with the actual API response
      onApprove(id, data as CreateMessageResult);
    } catch (error: unknown) {
      console.error("Error processing sampling request:", error);
      setError(error);
      // Call onApprove with an error result to properly represent the failure
      onApprove(id, {
        model: "error",
        stopReason: "api_error",
        role: "assistant",
        content: {
          type: "text",
          text: error instanceof Error ? error.message : "Unknown error occurred"
        }
      });
    }
  };

  return (
    <TabsContent value="sampling" className="h-96">
      <div className="space-y-4">
        <SamplingConfigComponent />
        <div className="flex items-end gap-4 p-4 border rounded">
          <div className="space-y-2">
            <Label>Sampling Strategy</Label>
            <Select value={config.strategy} onValueChange={handleStrategyChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {strategies.map((strategy: SamplingStrategyDefinition) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedStrategy?.configFields?.map(field => (
            <div key={field.name} className="flex-1 space-y-2">
              <Label>{field.label}</Label>
              <Input
                type="text"
                value={configValues[field.name] || ''}
                onChange={(e) => handleConfigChange(field.name, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>

        {error ? (
          <ErrorDisplay error={error} />
        ) : (
          <Alert>
            <AlertDescription>
              When the server requests LLM sampling, requests will appear here for approval.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Requests</h3>
          {pendingRequests.filter(request => !processingRequests.has(request.id)).map((request) => (
            <div key={request.id} className="p-4 border rounded-lg space-y-4">
              <pre className="bg-gray-50 p-2 rounded">
                {JSON.stringify(request.request, null, 2)}
              </pre>
              <div className="flex space-x-2">
                <Button onClick={() => handleApprove(request.id, request.request)}>
                  Approve
                </Button>
              <Button variant="outline" onClick={() => handleReject(request.id)}>
                  Reject
                </Button>
              </div>
            </div>
          ))}
          {pendingRequests.length === 0 && (
            <p className="text-gray-500">No pending requests</p>
          )}
        </div>
      </div>
    </TabsContent>
  );
};

export default SamplingTab;
