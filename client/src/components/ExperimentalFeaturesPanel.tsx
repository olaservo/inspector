import { useState } from 'react';
import {
  Paper,
  Button,
  TextInput,
  Badge,
  Switch,
  Textarea,
  Text,
  Stack,
  Group,
  Accordion,
  Alert,
  Code,
  CopyButton,
  ActionIcon,
  Select,
  Divider,
} from '@mantine/core';
import {
  IconChevronDown,
  IconSend,
  IconAlertTriangle,
  IconFlask,
  IconCode,
  IconCopy,
  IconCheck,
  IconPlus,
  IconTrash,
  IconHistory,
} from '@tabler/icons-react';
import { initialCapabilities, type ExperimentalCapability } from '@/mocks';

interface CustomHeader {
  key: string;
  value: string;
}

interface RequestHistoryEntry {
  id: string;
  method: string;
  params: string;
  status: 'success' | 'error';
  duration: number;
  timestamp: string;
  request: string;
  response: string;
}

export function ExperimentalFeaturesPanel() {
  const [capabilities, setCapabilities] = useState<ExperimentalCapability[]>(initialCapabilities);
  const [accordionValue, setAccordionValue] = useState<string[]>(['capabilities']);

  // JSON-RPC tester state
  const [method, setMethod] = useState('tools/list');
  const [params, setParams] = useState('{}');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>([]);
  const [requestHistory, setRequestHistory] = useState<RequestHistoryEntry[]>([]);

  // Custom headers handlers
  const addHeader = () => {
    setCustomHeaders([...customHeaders, { key: '', value: '' }]);
  };

  const removeHeader = (index: number) => {
    setCustomHeaders(customHeaders.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customHeaders];
    updated[index] = { ...updated[index], [field]: value };
    setCustomHeaders(updated);
  };

  // Load from history
  const loadFromHistory = (entryId: string) => {
    const entry = requestHistory.find((e) => e.id === entryId);
    if (entry) {
      setMethod(entry.method);
      setParams(entry.params);
    }
  };

  const toggleCapability = (id: string) => {
    setCapabilities((prev) =>
      prev.map((cap) =>
        cap.id === id ? { ...cap, enabled: !cap.enabled } : cap
      )
    );
  };

  const handleSendRequest = () => {
    setIsLoading(true);
    const startTime = Date.now();

    // Build headers object for display
    const headersObj: Record<string, string> = {};
    customHeaders.forEach(({ key, value }) => {
      if (key.trim()) headersObj[key.trim()] = value;
    });

    // Simulate sending request
    setTimeout(() => {
      const duration = Date.now() - startTime;
      let responseStr: string;
      let status: 'success' | 'error' = 'success';

      try {
        const parsedParams = JSON.parse(params);
        // Mock response
        const mockResponse = {
          jsonrpc: '2.0',
          id: 1,
          result: {
            _note: 'This is a mock response for demonstration',
            method,
            receivedParams: parsedParams,
            headers: Object.keys(headersObj).length > 0 ? headersObj : undefined,
            timestamp: new Date().toISOString(),
          },
        };
        responseStr = JSON.stringify(mockResponse, null, 2);
      } catch {
        status = 'error';
        responseStr = JSON.stringify(
          {
            jsonrpc: '2.0',
            id: 1,
            error: {
              code: -32700,
              message: 'Parse error',
              data: 'Invalid JSON in params',
            },
          },
          null,
          2
        );
      }

      setResult(responseStr);

      // Add to history
      const historyEntry: RequestHistoryEntry = {
        id: `req-${Date.now()}`,
        method,
        params,
        status,
        duration,
        timestamp: new Date().toISOString(),
        request: JSON.stringify({ method, params: params, headers: headersObj }, null, 2),
        response: responseStr,
      };
      setRequestHistory((prev) => [historyEntry, ...prev].slice(0, 20)); // Keep last 20

      setIsLoading(false);
    }, 500);
  };

  const enabledCount = capabilities.filter((c) => c.enabled).length;

  return (
    <Stack gap="md">
      <Accordion
        multiple
        value={accordionValue}
        onChange={setAccordionValue}
        variant="separated"
        chevron={<IconChevronDown size={16} />}
      >
        {/* Experimental Capabilities Section */}
        <Accordion.Item value="capabilities">
          <Accordion.Control>
            <Group gap="sm">
              <IconFlask size={20} />
              <Text fw={500}>Experimental Capabilities</Text>
              <Badge variant="light" size="sm">
                {enabledCount}/{capabilities.length} enabled
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Alert
                color="yellow"
                icon={<IconAlertTriangle size={16} />}
                variant="light"
              >
                Experimental features may change or be removed in future versions.
                Use with caution in production environments.
              </Alert>

              <Stack gap="sm">
                {capabilities.map((cap) => (
                  <Paper key={cap.id} withBorder p="sm" radius="md">
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" mb={4}>
                          <Text size="sm" fw={500}>{cap.name}</Text>
                          {cap.enabled && (
                            <Badge color="green" size="xs" variant="light">
                              Enabled
                            </Badge>
                          )}
                        </Group>
                        <Text size="sm" c="dimmed">{cap.description}</Text>
                        {cap.warning && (
                          <Group gap={4} mt={4}>
                            <IconAlertTriangle size={12} color="var(--mantine-color-yellow-5)" />
                            <Text size="xs" c="yellow">{cap.warning}</Text>
                          </Group>
                        )}
                      </div>
                      <Switch
                        checked={cap.enabled}
                        onChange={() => toggleCapability(cap.id)}
                      />
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* JSON-RPC Tester Section */}
        <Accordion.Item value="jsonrpc">
          <Accordion.Control>
            <Group gap="sm">
              <IconCode size={20} />
              <Text fw={500}>JSON-RPC Tester</Text>
              <Badge variant="outline" size="sm">
                Advanced
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text size="sm" c="dimmed">
                Send raw JSON-RPC requests to the connected server for testing and debugging.
              </Text>

              {/* Custom Headers Section */}
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>Custom Headers (optional)</Text>
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconPlus size={14} />}
                    onClick={addHeader}
                  >
                    Add Header
                  </Button>
                </Group>
                {customHeaders.length === 0 ? (
                  <Text size="xs" c="dimmed" fs="italic">
                    No custom headers configured
                  </Text>
                ) : (
                  <Stack gap="xs">
                    {customHeaders.map((header, index) => (
                      <Group key={index} gap="xs">
                        <TextInput
                          placeholder="Header-Name"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          size="xs"
                          style={{ flex: 1 }}
                        />
                        <TextInput
                          placeholder="value"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          size="xs"
                          style={{ flex: 1 }}
                        />
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={() => removeHeader(index)}
                        >
                          <IconTrash size={14} />
                        </ActionIcon>
                      </Group>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Divider />

              <TextInput
                label="Method"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                placeholder="e.g., tools/list, resources/read"
              />

              <Textarea
                label="Parameters (JSON)"
                value={params}
                onChange={(e) => setParams(e.target.value)}
                placeholder='{"key": "value"}'
                styles={{ input: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
                minRows={4}
              />

              <Group gap="xs">
                {requestHistory.length > 0 && (
                  <Select
                    placeholder="Load from History"
                    size="sm"
                    leftSection={<IconHistory size={14} />}
                    data={requestHistory.map((entry) => ({
                      value: entry.id,
                      label: `${entry.method} (${entry.status === 'success' ? 'OK' : 'Error'}) ${entry.duration}ms`,
                    }))}
                    onChange={(v) => v && loadFromHistory(v)}
                    clearable
                    style={{ flex: 1 }}
                  />
                )}
                <Button
                  onClick={handleSendRequest}
                  loading={isLoading}
                  leftSection={<IconSend size={16} />}
                  style={{ flex: requestHistory.length > 0 ? undefined : 1 }}
                  fullWidth={requestHistory.length === 0}
                >
                  {isLoading ? 'Sending...' : 'Send Request'}
                </Button>
              </Group>

              {result && (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" fw={500}>Response</Text>
                    <CopyButton value={result}>
                      {({ copied, copy }) => (
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={copy}
                          leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        >
                          {copied ? 'Copied' : 'Copy Response'}
                        </Button>
                      )}
                    </CopyButton>
                  </Group>
                  <Code
                    block
                    style={{
                      maxHeight: '200px',
                      overflow: 'auto',
                      fontSize: '0.75rem',
                    }}
                  >
                    {result}
                  </Code>
                </Stack>
              )}

              {/* Request History */}
              {requestHistory.length > 0 && (
                <>
                  <Divider />
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>Request History</Text>
                    <Stack gap="xs">
                      {requestHistory.slice(0, 5).map((entry) => (
                        <Paper key={entry.id} withBorder p="xs" radius="sm">
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap">
                              <Badge
                                size="xs"
                                color={entry.status === 'success' ? 'green' : 'red'}
                              >
                                {entry.status === 'success' ? 'OK' : 'Error'}
                              </Badge>
                              <Text size="xs" fw={500} truncate style={{ maxWidth: 150 }}>
                                {entry.method}
                              </Text>
                            </Group>
                            <Group gap="xs" wrap="nowrap">
                              <Text size="xs" c="dimmed">
                                {entry.duration}ms
                              </Text>
                              <Button
                                variant="subtle"
                                size="xs"
                                onClick={() => loadFromHistory(entry.id)}
                              >
                                Load
                              </Button>
                            </Group>
                          </Group>
                        </Paper>
                      ))}
                      {requestHistory.length > 5 && (
                        <Text size="xs" c="dimmed" ta="center">
                          +{requestHistory.length - 5} more in history
                        </Text>
                      )}
                    </Stack>
                  </Stack>
                </>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
}
