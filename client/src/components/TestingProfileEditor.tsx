import { useState, useEffect } from 'react';
import {
  Stack,
  Group,
  TextInput,
  Textarea,
  Select,
  Checkbox,
  Button,
  Text,
  Divider,
  Paper,
  ActionIcon,
  Table,
  NumberInput,
  Slider,
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import type {
  TestingProfile,
  SamplingProviderType,
  ModelOverride,
  AiSdkProviderConfig,
  AiSdkProviderName,
  ModelHintBehavior,
} from '@/types';

interface TestingProfileEditorProps {
  profile: TestingProfile;
  onSave: (profile: TestingProfile) => void;
  onCancel: () => void;
  isNew: boolean;
  existingNames: string[];
}

export function TestingProfileEditor({
  profile,
  onSave,
  onCancel,
  isNew,
  existingNames,
}: TestingProfileEditorProps) {
  // Form state
  const [name, setName] = useState(profile.name);
  const [description, setDescription] = useState(profile.description || '');
  const [samplingProvider, setSamplingProvider] =
    useState<SamplingProviderType>(profile.samplingProvider);
  const [autoRespond, setAutoRespond] = useState(profile.autoRespond);
  const [defaultResponse, setDefaultResponse] = useState(
    profile.defaultResponse || ''
  );
  const [defaultModel, setDefaultModel] = useState(profile.defaultModel || '');
  const [defaultStopReason, setDefaultStopReason] = useState<
    'endTurn' | 'stopSequence' | 'maxTokens' | 'toolUse'
  >(profile.defaultStopReason || 'endTurn');
  const [modelOverrides, setModelOverrides] = useState<ModelOverride[]>(
    profile.modelOverrides || []
  );
  const [elicitationAutoRespond, setElicitationAutoRespond] = useState(
    profile.elicitationAutoRespond || false
  );

  // AI SDK config state
  const [aiSdkProvider, setAiSdkProvider] = useState<AiSdkProviderName>(
    profile.aiSdkConfig?.provider || 'anthropic'
  );
  const [aiSdkModelId, setAiSdkModelId] = useState(
    profile.aiSdkConfig?.modelId || ''
  );
  const [aiSdkBaseUrl, setAiSdkBaseUrl] = useState(
    profile.aiSdkConfig?.baseUrl || ''
  );
  const [aiSdkTemperature, setAiSdkTemperature] = useState<number | undefined>(
    profile.aiSdkConfig?.defaultTemperature
  );
  const [aiSdkMaxTokens, setAiSdkMaxTokens] = useState<number | undefined>(
    profile.aiSdkConfig?.defaultMaxTokens
  );
  const [aiSdkModelHintBehavior, setAiSdkModelHintBehavior] =
    useState<ModelHintBehavior>(
      profile.aiSdkConfig?.modelHintBehavior || 'prefer-hint'
    );

  // Reset form when profile changes
  useEffect(() => {
    setName(profile.name);
    setDescription(profile.description || '');
    setSamplingProvider(profile.samplingProvider);
    setAutoRespond(profile.autoRespond);
    setDefaultResponse(profile.defaultResponse || '');
    setDefaultModel(profile.defaultModel || '');
    setDefaultStopReason(profile.defaultStopReason || 'endTurn');
    setModelOverrides(profile.modelOverrides || []);
    setElicitationAutoRespond(profile.elicitationAutoRespond || false);
    // AI SDK config
    setAiSdkProvider(profile.aiSdkConfig?.provider || 'anthropic');
    setAiSdkModelId(profile.aiSdkConfig?.modelId || '');
    setAiSdkBaseUrl(profile.aiSdkConfig?.baseUrl || '');
    setAiSdkTemperature(profile.aiSdkConfig?.defaultTemperature);
    setAiSdkMaxTokens(profile.aiSdkConfig?.defaultMaxTokens);
    setAiSdkModelHintBehavior(
      profile.aiSdkConfig?.modelHintBehavior || 'prefer-hint'
    );
  }, [profile]);

  // Validation
  const nameError = (() => {
    if (!name.trim()) return 'Name is required';
    if (
      existingNames.some(
        (n) => n.toLowerCase() === name.toLowerCase() && n !== profile.name
      )
    ) {
      return 'A profile with this name already exists';
    }
    return null;
  })();

  const aiSdkModelError = (() => {
    if (samplingProvider === 'ai-sdk' && !aiSdkModelId.trim()) {
      return 'Model ID is required for AI SDK provider';
    }
    if (samplingProvider === 'ai-sdk' && aiSdkProvider === 'custom' && !aiSdkBaseUrl.trim()) {
      return 'Base URL is required for custom provider';
    }
    return null;
  })();

  const isValid = !nameError && !aiSdkModelError;

  // Model overrides handlers
  const addOverride = () => {
    setModelOverrides([...modelOverrides, { pattern: '', response: '' }]);
  };

  const removeOverride = (index: number) => {
    setModelOverrides(modelOverrides.filter((_, i) => i !== index));
  };

  const updateOverride = (
    index: number,
    field: 'pattern' | 'response',
    value: string
  ) => {
    const updated = [...modelOverrides];
    updated[index] = { ...updated[index], [field]: value };
    setModelOverrides(updated);
  };

  // Save handler
  const handleSave = () => {
    if (!isValid) return;

    // Build AI SDK config if that provider is selected
    const aiSdkConfig: AiSdkProviderConfig | undefined =
      samplingProvider === 'ai-sdk'
        ? {
            provider: aiSdkProvider,
            modelId: aiSdkModelId.trim(),
            modelHintBehavior: aiSdkModelHintBehavior,
            ...(aiSdkBaseUrl.trim() && { baseUrl: aiSdkBaseUrl.trim() }),
            ...(aiSdkTemperature !== undefined && {
              defaultTemperature: aiSdkTemperature,
            }),
            ...(aiSdkMaxTokens !== undefined && {
              defaultMaxTokens: aiSdkMaxTokens,
            }),
          }
        : undefined;

    const updatedProfile: TestingProfile = {
      id: profile.id,
      name: name.trim(),
      description: description.trim() || undefined,
      samplingProvider,
      autoRespond,
      defaultResponse: defaultResponse.trim() || undefined,
      defaultModel: defaultModel.trim() || undefined,
      defaultStopReason,
      modelOverrides:
        modelOverrides.filter((o) => o.pattern.trim()).length > 0
          ? modelOverrides.filter((o) => o.pattern.trim())
          : undefined,
      elicitationAutoRespond,
      elicitationDefaults: profile.elicitationDefaults,
      aiSdkConfig,
    };

    onSave(updatedProfile);
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="sm" fw={600}>
            {isNew ? 'New Profile' : `Editing: ${profile.name}`}
          </Text>
        </Group>

        <Divider />

        {/* Basic Info */}
        <TextInput
          label="Profile Name"
          placeholder="Enter profile name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={nameError}
          required
        />

        <Textarea
          label="Description"
          placeholder="Optional description of this profile"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minRows={2}
        />

        <Divider />

        {/* Provider Settings */}
        <Select
          label="Sampling Provider"
          description="How sampling requests should be handled"
          value={samplingProvider}
          onChange={(v) => setSamplingProvider(v as SamplingProviderType)}
          data={[
            { value: 'manual', label: 'Manual' },
            { value: 'mock', label: 'Mock/Template' },
            { value: 'ai-sdk', label: 'AI SDK (Real LLM)' },
          ]}
        />

        <Checkbox
          label="Auto-respond to sampling requests"
          description="Automatically send response without user interaction"
          checked={autoRespond}
          onChange={(e) => setAutoRespond(e.currentTarget.checked)}
        />

        {samplingProvider === 'mock' && (
          <>
            <Textarea
              label="Default Response Template"
              placeholder="The default response to use for sampling requests"
              value={defaultResponse}
              onChange={(e) => setDefaultResponse(e.target.value)}
              minRows={3}
            />

            <Group grow>
              <TextInput
                label="Default Model"
                placeholder="e.g., mock-model-1.0"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
              />

              <Select
                label="Default Stop Reason"
                value={defaultStopReason}
                onChange={(v) =>
                  setDefaultStopReason(
                    v as 'endTurn' | 'stopSequence' | 'maxTokens' | 'toolUse'
                  )
                }
                data={[
                  { value: 'endTurn', label: 'End Turn' },
                  { value: 'stopSequence', label: 'Stop Sequence' },
                  { value: 'maxTokens', label: 'Max Tokens' },
                  { value: 'toolUse', label: 'Tool Use' },
                ]}
              />
            </Group>

            <Divider />

            {/* Model Overrides */}
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="sm" fw={500}>
                    Model-Specific Overrides
                  </Text>
                  <Text size="xs" c="dimmed">
                    Match model hints with patterns (e.g., claude-*, gpt-*)
                  </Text>
                </div>
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconPlus size={14} />}
                  onClick={addOverride}
                >
                  Add Override
                </Button>
              </Group>

              {modelOverrides.length === 0 ? (
                <Text size="sm" c="dimmed" fs="italic">
                  No model-specific overrides configured
                </Text>
              ) : (
                <Table>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: '30%' }}>Pattern</Table.Th>
                      <Table.Th>Response Template</Table.Th>
                      <Table.Th style={{ width: 50 }}></Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {modelOverrides.map((override, index) => (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <TextInput
                            placeholder="claude-*"
                            value={override.pattern}
                            onChange={(e) =>
                              updateOverride(index, 'pattern', e.target.value)
                            }
                            size="xs"
                          />
                        </Table.Td>
                        <Table.Td>
                          <TextInput
                            placeholder="Response for this model..."
                            value={override.response}
                            onChange={(e) =>
                              updateOverride(index, 'response', e.target.value)
                            }
                            size="xs"
                          />
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removeOverride(index)}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Stack>
          </>
        )}

        {/* AI SDK Configuration */}
        {samplingProvider === 'ai-sdk' && (
          <>
            <Select
              label="LLM Provider"
              description="Which LLM provider to use"
              value={aiSdkProvider}
              onChange={(v) => setAiSdkProvider(v as AiSdkProviderName)}
              data={[
                { value: 'anthropic', label: 'Anthropic (Claude)' },
                { value: 'openai', label: 'OpenAI (GPT)' },
                { value: 'custom', label: 'Custom (OpenAI-compatible)' },
              ]}
            />

            {aiSdkProvider === 'custom' && (
              <TextInput
                label="Base URL"
                placeholder="https://api.example.com/v1"
                description="Base URL for custom OpenAI-compatible API"
                value={aiSdkBaseUrl}
                onChange={(e) => setAiSdkBaseUrl(e.target.value)}
                required
              />
            )}

            <TextInput
              label="Model ID"
              placeholder={
                aiSdkProvider === 'anthropic'
                  ? 'claude-sonnet-4-20250514'
                  : aiSdkProvider === 'openai'
                    ? 'gpt-4o'
                    : 'model-id'
              }
              description="The model identifier to use"
              value={aiSdkModelId}
              onChange={(e) => setAiSdkModelId(e.target.value)}
              error={aiSdkModelError}
              required
            />

            <Select
              label="Model Hint Behavior"
              description="How to handle model hints from the server"
              value={aiSdkModelHintBehavior}
              onChange={(v) => setAiSdkModelHintBehavior(v as ModelHintBehavior)}
              data={[
                {
                  value: 'ignore',
                  label: 'Ignore hints (always use configured model)',
                },
                {
                  value: 'prefer-hint',
                  label: 'Prefer hints (use hint if available)',
                },
                {
                  value: 'require-match',
                  label: 'Require match (only respond if hint matches)',
                },
              ]}
            />

            <Group grow>
              <div>
                <Text size="sm" fw={500} mb={4}>
                  Temperature
                </Text>
                <Text size="xs" c="dimmed" mb="xs">
                  Controls randomness (0 = focused, 2 = creative)
                </Text>
                <Slider
                  value={aiSdkTemperature ?? 1}
                  onChange={setAiSdkTemperature}
                  min={0}
                  max={2}
                  step={0.1}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 1, label: '1' },
                    { value: 2, label: '2' },
                  ]}
                />
              </div>

              <NumberInput
                label="Max Tokens"
                description="Maximum tokens in response"
                placeholder="4096"
                value={aiSdkMaxTokens}
                onChange={(v) =>
                  setAiSdkMaxTokens(typeof v === 'number' ? v : undefined)
                }
                min={1}
                max={128000}
              />
            </Group>

            <Text size="xs" c="dimmed" fs="italic">
              API key will be requested when this profile is activated. Keys are
              not stored.
            </Text>
          </>
        )}

        <Divider />

        {/* Elicitation Settings */}
        <Checkbox
          label="Auto-respond to elicitation requests"
          description="Automatically submit elicitation forms with default values"
          checked={elicitationAutoRespond}
          onChange={(e) => setElicitationAutoRespond(e.currentTarget.checked)}
        />

        <Divider />

        {/* Actions */}
        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {isNew ? 'Create Profile' : 'Save Changes'}
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
