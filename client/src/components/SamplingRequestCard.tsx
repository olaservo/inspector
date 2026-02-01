import { useState, useEffect } from 'react';
import {
  Card,
  Stack,
  Group,
  Text,
  Badge,
  Textarea,
  TextInput,
  Select,
  Button,
  ActionIcon,
  Checkbox,
  Divider,
  ScrollArea,
} from '@mantine/core';
import {
  IconBrain,
  IconX,
  IconEdit,
  IconPlayerPlay,
  IconCopy,
  IconCheck,
  IconPhoto,
  IconPlus,
} from '@tabler/icons-react';
import type {
  SamplingRequest,
  SamplingMessage,
  TestingProfile,
  ToolCall,
} from '@modelcontextprotocol/inspector-core';
import { getResponseForModelHint } from '@modelcontextprotocol/inspector-core';
import { TestingProfileSelector } from './TestingProfileSelector';

export interface SamplingResponse {
  content: { type: 'text'; text: string };
  model: string;
  stopReason: 'endTurn' | 'stopSequence' | 'maxTokens' | 'toolUse';
  toolCalls?: ToolCall[];
}

interface SamplingRequestCardProps {
  request: SamplingRequest;
  requestId: string;
  position: { current: number; total: number };
  activeProfile: TestingProfile | undefined;
  profiles: TestingProfile[];
  onProfileChange: (profileId: string) => void;
  onAutoRespond: (response: SamplingResponse) => void;
  onEditAndSend: (response: SamplingResponse) => void;
  onReject: () => void;
}

function MessageDisplay({ message }: { message: SamplingMessage }) {
  const content = Array.isArray(message.content) ? message.content : [message.content];

  return (
    <Stack gap="xs" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
      <Badge variant="outline" size="xs">
        {message.role}
      </Badge>
      {content.map((block, idx) => {
        if (block.type === 'text') {
          return <Text key={idx} size="xs">{block.text}</Text>;
        } else if (block.type === 'image') {
          return (
            <Group key={idx} gap="xs">
              <IconPhoto size={14} />
              <Text size="xs" c="dimmed">
                [Image: {block.mimeType}]
              </Text>
            </Group>
          );
        } else if (block.type === 'tool_use') {
          return (
            <Group key={idx} gap="xs">
              <Badge size="xs" color="blue">tool_use</Badge>
              <Text size="xs" c="dimmed">{block.name}</Text>
            </Group>
          );
        } else if (block.type === 'tool_result') {
          return (
            <Group key={idx} gap="xs">
              <Badge size="xs" color="green">tool_result</Badge>
              <Text size="xs" c="dimmed">for {block.toolUseId}</Text>
            </Group>
          );
        }
        return null;
      })}
    </Stack>
  );
}

export function SamplingRequestCard({
  request,
  position,
  activeProfile,
  profiles,
  onProfileChange,
  onAutoRespond,
  onEditAndSend,
  onReject,
}: SamplingRequestCardProps) {
  // Get default response from profile
  const getDefaultResponse = () => {
    if (!activeProfile) return '';
    return getResponseForModelHint(
      activeProfile,
      request.modelPreferences?.hints
    );
  };

  const getDefaultModel = () => {
    return activeProfile?.defaultModel || 'mock-model-1.0';
  };

  const getDefaultStopReason = () => {
    return activeProfile?.defaultStopReason || 'endTurn';
  };

  const [response, setResponse] = useState(getDefaultResponse);
  const [modelUsed, setModelUsed] = useState(getDefaultModel);
  const [stopReason, setStopReason] = useState<
    'endTurn' | 'stopSequence' | 'maxTokens' | 'toolUse'
  >(getDefaultStopReason);
  const [copied, setCopied] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [toolChoice, setToolChoice] = useState<string>(
    request.toolChoice?.type === 'tool'
      ? `tool:${request.toolChoice.name}`
      : request.toolChoice?.type || 'auto'
  );

  // Update response when profile changes
  useEffect(() => {
    setResponse(getDefaultResponse());
    setModelUsed(getDefaultModel());
    setStopReason(getDefaultStopReason());
  }, [activeProfile?.id]);

  const handleCopyResponse = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildResponse = (): SamplingResponse => ({
    content: { type: 'text', text: response },
    model: modelUsed,
    stopReason,
    toolCalls: stopReason === 'toolUse' && toolCalls.length > 0 ? toolCalls : undefined,
  });

  const handleAutoRespond = () => {
    onAutoRespond(buildResponse());
  };

  const handleEditAndSend = () => {
    onEditAndSend(buildResponse());
  };

  const handleAddToolCall = () => {
    const newCall: ToolCall = {
      id: `call-${Date.now()}`,
      name: request.tools?.[0]?.name || '',
      arguments: {},
    };
    setToolCalls([...toolCalls, newCall]);
  };

  const handleRemoveToolCall = (index: number) => {
    setToolCalls(toolCalls.filter((_, i) => i !== index));
  };

  const handleUpdateToolCall = (index: number, updates: Partial<ToolCall>) => {
    const updated = [...toolCalls];
    updated[index] = { ...updated[index], ...updates };
    setToolCalls(updated);
  };

  return (
    <Card withBorder p="sm">
      <Stack gap="xs">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            <IconBrain size={16} />
            <Text size="sm" fw={500}>
              sampling/createMessage
            </Text>
          </Group>
          <Badge variant="outline" size="sm">
            {position.current} of {position.total}
          </Badge>
        </Group>

        {/* Messages */}
        <Card withBorder p="xs">
          <ScrollArea h={100}>
            <Stack gap="xs">
              {request.messages.map((msg, idx) => (
                <MessageDisplay key={idx} message={msg} />
              ))}
            </Stack>
          </ScrollArea>
        </Card>

        {/* Model hints */}
        {request.modelPreferences?.hints &&
          request.modelPreferences.hints.length > 0 && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Model hints:
              </Text>
              {request.modelPreferences.hints.map((hint) => (
                <Badge key={hint} variant="light" size="xs">
                  {hint}
                </Badge>
              ))}
            </Group>
          )}

        {/* Parameters */}
        <Group gap="md">
          <Group gap="xs">
            <Text size="xs" c="dimmed">Max Tokens:</Text>
            <Text size="xs">{request.maxTokens}</Text>
          </Group>
          {request.temperature !== undefined && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">Temperature:</Text>
              <Text size="xs">{request.temperature}</Text>
            </Group>
          )}
          {request.stopSequences && request.stopSequences.length > 0 && (
            <Group gap="xs">
              <Text size="xs" c="dimmed">Stop:</Text>
              <Text size="xs">[{request.stopSequences.join(', ')}]</Text>
            </Group>
          )}
        </Group>

        {/* Tools (if present) */}
        {request.tools && request.tools.length > 0 && (
          <Card withBorder p="xs">
            <Stack gap="xs">
              <Text size="xs" fw={500}>Tools ({request.tools.length}):</Text>
              <Stack gap={4}>
                {request.tools.map((tool) => (
                  <Group key={tool.name} gap="xs" wrap="nowrap">
                    <Badge variant="outline" size="xs" style={{ flexShrink: 0 }}>
                      {tool.name}
                    </Badge>
                    {tool.description && (
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {tool.description}
                      </Text>
                    )}
                  </Group>
                ))}
              </Stack>
              <Group gap="xs" align="center">
                <Text size="xs" c="dimmed">Tool Choice:</Text>
                <Select
                  size="xs"
                  value={toolChoice}
                  onChange={(v) => setToolChoice(v || 'auto')}
                  data={[
                    { value: 'auto', label: 'auto' },
                    { value: 'none', label: 'none' },
                    { value: 'required', label: 'required' },
                    ...(request.tools?.map((t) => ({
                      value: `tool:${t.name}`,
                      label: t.name,
                    })) || []),
                  ]}
                  style={{ width: 120 }}
                />
              </Group>
            </Stack>
          </Card>
        )}

        {/* Include Context */}
        {request.includeContext && request.includeContext !== 'none' && (
          <Checkbox
            size="xs"
            checked
            disabled
            label={`Include Context: ${request.includeContext}`}
          />
        )}

        <Divider />

        {/* Testing Profile */}
        <TestingProfileSelector
          profiles={profiles}
          activeProfileId={activeProfile?.id || 'manual'}
          onChange={onProfileChange}
          size="xs"
          label="Testing Profile"
        />

        {/* Response */}
        <div>
          <Group justify="space-between" mb={4}>
            <Text size="xs" fw={500}>Response:</Text>
            <ActionIcon variant="subtle" size="xs" onClick={handleCopyResponse}>
              {copied ? <IconCheck size={12} color="green" /> : <IconCopy size={12} />}
            </ActionIcon>
          </Group>
          <Textarea
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            minRows={2}
            maxRows={4}
            size="xs"
            styles={{ input: { fontFamily: 'monospace', fontSize: '0.75rem' } }}
            placeholder="Enter mock LLM response..."
          />
        </div>

        {/* Model and Stop Reason */}
        <Group grow gap="xs">
          <TextInput
            label="Model"
            value={modelUsed}
            onChange={(e) => setModelUsed(e.target.value)}
            size="xs"
            placeholder="e.g., claude-3-sonnet"
          />
          <Select
            label="Stop Reason"
            value={stopReason}
            onChange={(v) =>
              setStopReason(
                (v as 'endTurn' | 'stopSequence' | 'maxTokens' | 'toolUse') ||
                  'endTurn'
              )
            }
            size="xs"
            data={[
              { value: 'endTurn', label: 'endTurn' },
              { value: 'stopSequence', label: 'stopSequence' },
              { value: 'maxTokens', label: 'maxTokens' },
              { value: 'toolUse', label: 'toolUse' },
            ]}
            allowDeselect={false}
          />
        </Group>

        {/* Tool Calls (when stopReason is toolUse and tools are available) */}
        {stopReason === 'toolUse' && request.tools && request.tools.length > 0 && (
          <Card withBorder p="xs">
            <Group justify="space-between" mb="xs">
              <Text size="xs" fw={500}>Tool Calls:</Text>
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconPlus size={12} />}
                onClick={handleAddToolCall}
              >
                Add
              </Button>
            </Group>
            <Stack gap="xs">
              {toolCalls.length === 0 ? (
                <Text size="xs" c="dimmed">
                  No tool calls. Add tool calls or change stop reason.
                </Text>
              ) : (
                toolCalls.map((call, idx) => (
                  <Group key={call.id} gap="xs" wrap="nowrap">
                    <Select
                      size="xs"
                      placeholder="Tool"
                      value={call.name}
                      onChange={(v) => handleUpdateToolCall(idx, { name: v || '' })}
                      data={request.tools?.map(t => ({ value: t.name, label: t.name })) || []}
                      style={{ width: 100 }}
                    />
                    <TextInput
                      size="xs"
                      placeholder='{"arg": "value"}'
                      value={JSON.stringify(call.arguments)}
                      onChange={(e) => {
                        try {
                          const args = JSON.parse(e.target.value);
                          handleUpdateToolCall(idx, { arguments: args });
                        } catch {
                          // Ignore parse errors while typing
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color="red"
                      onClick={() => handleRemoveToolCall(idx)}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  </Group>
                ))
              )}
            </Stack>
          </Card>
        )}

        {/* Action buttons */}
        <Group justify="flex-end" gap="xs" mt="xs">
          <Button
            size="xs"
            variant="outline"
            color="red"
            leftSection={<IconX size={14} />}
            onClick={onReject}
          >
            Reject
          </Button>
          <Button
            size="xs"
            variant="outline"
            leftSection={<IconEdit size={14} />}
            onClick={handleEditAndSend}
          >
            Edit & Send
          </Button>
          <Button
            size="xs"
            leftSection={<IconPlayerPlay size={14} />}
            onClick={handleAutoRespond}
            disabled={!activeProfile?.autoRespond}
          >
            Auto-respond
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
