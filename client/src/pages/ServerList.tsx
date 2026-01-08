import { useState } from 'react';
import {
  Container,
  Title,
  Group,
  Menu,
  Button,
  SimpleGrid,
  Card,
  TextInput,
  Text,
  Badge,
  Stack,
  Loader,
  Alert,
} from '@mantine/core';
import { IconPlugConnected, IconPlugConnectedX, IconAlertCircle } from '@tabler/icons-react';
import { ServerCard, ConnectionMode } from '../components/ServerCard';
import { AddServerModal, ServerConfig } from '../components/AddServerModal';
import { ImportServerJsonModal } from '../components/ImportServerJsonModal';
import { showInfoToast, showSuccessToast, showErrorToast } from '../lib/toast';
import { useMcp } from '@/context';
import { mockServers } from '@/mocks';

export function ServerList() {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importJsonModalOpen, setImportJsonModalOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState('http://localhost:3000/mcp');

  // MCP connection state
  const { connect, disconnect, connectionState, serverInfo, error } = useMcp();

  const handleConnect = async () => {
    if (!serverUrl.trim()) {
      showErrorToast('Invalid URL', { description: 'Please enter a server URL' });
      return;
    }
    try {
      await connect(serverUrl);
      if (connectionState !== 'error') {
        showSuccessToast('Connected', `Connected to MCP server`);
      }
    } catch (err) {
      showErrorToast('Connection Failed', {
        description: err instanceof Error ? err.message : 'Unknown error',
        errorType: 'connection_failed',
      });
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    showInfoToast('Disconnected', 'Disconnected from MCP server');
  };

  const handleSaveServer = (_config: ServerConfig) => {
    // TODO: Actually save the server config
  };

  const handleImportServerJson = (_config: {
    name: string;
    transport: string;
    command?: string;
    url?: string;
    env: Record<string, string>;
  }) => {
    // TODO: Actually save the imported server config
  };

  const handleImportConfig = () => {
    showInfoToast('Import Config', 'Claude Desktop config import coming soon');
  };

  // Handler for connection mode changes (demonstrates toast usage)
  const handleConnectionModeChange = (_serverId: string, mode: ConnectionMode) => {
    showSuccessToast('Connection Mode Updated', `Server now using ${mode} connection`);
  };

  // Get connection status badge
  const getStatusBadge = () => {
    switch (connectionState) {
      case 'connected':
        return <Badge color="green" leftSection={<IconPlugConnected size={14} />}>Connected</Badge>;
      case 'connecting':
        return <Badge color="blue" leftSection={<Loader size={14} />}>Connecting...</Badge>;
      case 'error':
        return <Badge color="red" leftSection={<IconAlertCircle size={14} />}>Error</Badge>;
      default:
        return <Badge color="gray" leftSection={<IconPlugConnectedX size={14} />}>Disconnected</Badge>;
    }
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>MCP Inspector</Title>
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button>+ Add Server</Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => setAddModalOpen(true)}>Add manually</Menu.Item>
            <Menu.Item onClick={handleImportConfig}>Import config</Menu.Item>
            <Menu.Item onClick={() => setImportJsonModalOpen(true)}>Import server.json</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      {/* Quick Connect Panel - Direct HTTP Connection */}
      <Card withBorder mb="xl" p="md">
        <Stack gap="sm">
          <Group justify="space-between">
            <Text fw={500}>Quick Connect (Direct HTTP)</Text>
            {getStatusBadge()}
          </Group>

          <Group align="flex-end">
            <TextInput
              label="Server URL"
              placeholder="http://localhost:3000/mcp"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              style={{ flex: 1 }}
              disabled={connectionState === 'connecting' || connectionState === 'connected'}
            />
            {connectionState === 'connected' ? (
              <Button color="red" variant="outline" onClick={handleDisconnect}>
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={handleConnect}
                loading={connectionState === 'connecting'}
                disabled={connectionState === 'connecting'}
              >
                Connect
              </Button>
            )}
          </Group>

          {/* Show server info when connected */}
          {serverInfo && (
            <Alert color="green" variant="light">
              <Text size="sm">
                <strong>{serverInfo.name}</strong> v{serverInfo.version}
              </Text>
              {serverInfo.instructions && (
                <Text size="xs" c="dimmed" mt={4}>{serverInfo.instructions}</Text>
              )}
              <Group gap="xs" mt="xs">
                {serverInfo.capabilities.tools && <Badge size="xs" variant="outline">Tools</Badge>}
                {serverInfo.capabilities.resources && <Badge size="xs" variant="outline">Resources</Badge>}
                {serverInfo.capabilities.prompts && <Badge size="xs" variant="outline">Prompts</Badge>}
                {serverInfo.capabilities.logging && <Badge size="xs" variant="outline">Logging</Badge>}
              </Group>
            </Alert>
          )}

          {/* Show error when connection fails */}
          {error && (
            <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />}>
              <Text size="sm">{error.message}</Text>
            </Alert>
          )}
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {mockServers.map((server) => (
          <ServerCard
            key={server.id}
            server={server}
            onConnectionModeChange={handleConnectionModeChange}
          />
        ))}
      </SimpleGrid>

      <AddServerModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSave={handleSaveServer}
      />

      <ImportServerJsonModal
        open={importJsonModalOpen}
        onOpenChange={setImportJsonModalOpen}
        onImport={handleImportServerJson}
      />
    </Container>
  );
}
