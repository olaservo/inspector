import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { useSamplingConfig } from "@/lib/contexts/useSamplingConfig";
import { availableStrategies, CreateMessageResult } from "@/config/sampling";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { useState } from "react";

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
  const { config, setConfig } = useSamplingConfig();
  const selectedStrategy = availableStrategies.find(s => s.id === config.strategy);
  const [configValues, setConfigValues] = useState<Record<string, string>>(
    Object.fromEntries(
      selectedStrategy?.configFields?.map(field => [field.name, (config.config[field.name] as string) || '']) || []
    )
  );

  const handleStrategyChange = (value: string) => {
    setConfig({
      strategy: value,
      config: {}
    });
    setConfigValues({});
  };

  const handleConfigChange = (field: string, value: string) => {
    const newValues = { ...configValues, [field]: value };
    setConfigValues(newValues);
    setConfig({
      ...config,
      config: newValues
    });
  };

  const handleApprove = async (id: number, request: z.infer<typeof CreateMessageRequestSchema>) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch("http://localhost:3000/api/sampling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          strategy: config.strategy,
          config: config.config,
          request
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to process sampling request");
      }

      const result = await response.json() as CreateMessageResult;
      onApprove(id, result);
    } catch (error: unknown) {
      console.error("Error processing sampling request:", error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          alert('Request timed out after 30 seconds. Please try again.');
        } else {
          alert(`Error processing sampling request: ${error.message}`);
        }
      } else {
        alert('Error processing sampling request. Please try again.');
      }
    }
  };

  return (
    <TabsContent value="sampling" className="h-96">
      <div className="space-y-4">
        <div className="flex items-end gap-4 p-4 border rounded">
          <div className="space-y-2">
            <Label>Sampling Strategy</Label>
            <Select value={config.strategy} onValueChange={handleStrategyChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {availableStrategies.map(strategy => (
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

        <Alert>
          <AlertDescription>
            When the server requests LLM sampling, requests will appear here for approval.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Requests</h3>
          {pendingRequests.map((request) => (
            <div key={request.id} className="p-4 border rounded-lg space-y-4">
              <pre className="bg-gray-50 p-2 rounded">
                {JSON.stringify(request.request, null, 2)}
              </pre>
              <div className="flex space-x-2">
                <Button onClick={() => handleApprove(request.id, request.request)}>
                  Approve
                </Button>
                <Button variant="outline" onClick={() => onReject(request.id)}>
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
