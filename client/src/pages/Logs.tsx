import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Stack,
  Select,
  ScrollArea,
  Text,
  Grid,
  Group,
  Badge,
  Button,
  TextInput,
  Checkbox,
  Menu,
} from '@mantine/core';
import { IconCopy, IconChevronDown, IconDownload, IconExternalLink } from '@tabler/icons-react';
import { mockLogs, logLevels, levelColors, initialHistory } from '@/mocks';
import type { RequestInfo } from '@/types/responses';

export function Logs() {
  const navigate = useNavigate();
  const [logLevel, setLogLevel] = useState<string | null>('debug');
  const [filter, setFilter] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  // All 8 RFC 5424 log levels
  const [visibleLevels, setVisibleLevels] = useState({
    debug: true,
    info: true,
    notice: true,
    warning: true,
    error: true,
    critical: true,
    alert: true,
    emergency: true,
  });

  const toggleLevel = (level: string) => {
    setVisibleLevels((prev) => ({ ...prev, [level]: !prev[level as keyof typeof prev] }));
  };

  // Get unique requests from logs for the filter dropdown
  const uniqueRequests = useMemo((): RequestInfo[] => {
    const requestMap = new Map<string, RequestInfo>();

    mockLogs.forEach(log => {
      if (log.requestId && !requestMap.has(log.requestId)) {
        // Find matching history entry for method/target info
        const historyEntry = initialHistory.find(h => h.id === log.requestId);
        requestMap.set(log.requestId, {
          id: log.requestId,
          method: historyEntry?.method || log.logger,
          target: historyEntry?.target ?? undefined,
          timestamp: log.timestamp,
        });
      }
    });

    // Sort by timestamp descending (most recent first)
    return Array.from(requestMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, []);

  const filteredLogs = mockLogs.filter((log) => {
    const matchesFilter = filter === '' || log.message.toLowerCase().includes(filter.toLowerCase());
    const matchesLevel = visibleLevels[log.level as keyof typeof visibleLevels] ?? true;

    // Request chain filtering
    let matchesRequest = true;
    if (selectedRequestId) {
      // Get the parent ID if this is a child request
      const selectedLog = mockLogs.find(l => l.requestId === selectedRequestId);
      const parentId = selectedLog?.parentRequestId || selectedRequestId;

      // Include logs that match:
      // 1. The selected request itself
      // 2. The parent of the selected request
      // 3. Any siblings (logs with the same parent)
      matchesRequest =
        log.requestId === selectedRequestId ||
        log.requestId === parentId ||
        log.parentRequestId === parentId ||
        log.parentRequestId === selectedRequestId;
    }

    return matchesFilter && matchesLevel && matchesRequest;
  });

  const handleShowAllLogs = () => {
    setSelectedRequestId(null);
    setFilter('');
  };

  const handleViewInHistory = () => {
    if (selectedRequestId) {
      // Find the root request ID for navigation
      const selectedLog = mockLogs.find(l => l.requestId === selectedRequestId);
      const rootId = selectedLog?.parentRequestId || selectedRequestId;
      navigate(`/history?highlight=${rootId}`);
    }
  };

  // Export as JSON
  const handleExportJson = () => {
    const exportData = filteredLogs.map((log) => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      logger: log.logger,
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export as Text
  const handleExportText = () => {
    const lines = filteredLogs.map(
      (log) => `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.logger}] ${log.message}`
    );
    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcp-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy all logs to clipboard
  const handleCopyAll = () => {
    const lines = filteredLogs.map(
      (log) => `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.logger}] ${log.message}`
    );
    navigator.clipboard.writeText(lines.join('\n'));
  };

  return (
    <Grid gutter="md" h="calc(100vh - 120px)">
      {/* Left Panel - Controls (25%) */}
      <Grid.Col span={3}>
        <Card withBorder h="100%">
          <Stack gap="lg" p="md">
            {/* Log Level */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Log Level</Text>
              <Group gap="sm">
                <Select
                  flex={1}
                  size="sm"
                  value={logLevel}
                  onChange={setLogLevel}
                  data={logLevels.map((level) => ({
                    value: level,
                    label: level.charAt(0).toUpperCase() + level.slice(1),
                  }))}
                />
                <Button size="sm">Set Level</Button>
              </Group>
            </Stack>

            {/* Text Filter */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Filter</Text>
              <TextInput
                placeholder="Search logs..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </Stack>

            {/* Level Checkboxes */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Show Levels</Text>
              <Stack gap="xs">
                {Object.entries(visibleLevels).map(([level, checked]) => (
                  <Checkbox
                    key={level}
                    checked={checked}
                    onChange={() => toggleLevel(level)}
                    label={
                      <Text size="sm" tt="uppercase" c={levelColors[level]}>
                        {level}
                      </Text>
                    }
                  />
                ))}
              </Stack>
            </Stack>

            {/* Request Filter */}
            <Stack gap="xs">
              <Text size="sm" fw={500}>Request Filter</Text>
              <Select
                size="sm"
                placeholder="All requests"
                value={selectedRequestId}
                onChange={setSelectedRequestId}
                clearable
                data={uniqueRequests.map(req => ({
                  value: req.id,
                  label: `${req.target || req.method} (${new Date(req.timestamp).toLocaleTimeString()})`,
                }))}
              />
              {selectedRequestId && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={handleShowAllLogs}
                >
                  Show All Logs
                </Button>
              )}
            </Stack>

            {/* Actions */}
            <Group gap="sm">
              <Button variant="outline" size="sm" flex={1}>
                Clear
              </Button>
              {/* Export dropdown menu */}
              <Menu shadow="md" width={160}>
                <Menu.Target>
                  <Button
                    variant="outline"
                    size="sm"
                    flex={1}
                    rightSection={<IconChevronDown size={14} />}
                  >
                    Export
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    leftSection={<IconDownload size={14} />}
                    onClick={handleExportJson}
                  >
                    Export as JSON
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconDownload size={14} />}
                    onClick={handleExportText}
                  >
                    Export as Text
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Stack>
        </Card>
      </Grid.Col>

      {/* Right Panel - Log Stream (75%) */}
      <Grid.Col span={9}>
        <Card withBorder h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
          <Group justify="space-between" p="md" style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}>
            <Group gap="md">
              <Text fw={600}>Log Stream</Text>
              {selectedRequestId && (
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    Filtered: {selectedRequestId}
                  </Text>
                  <Button
                    variant="subtle"
                    size="xs"
                    rightSection={<IconExternalLink size={14} />}
                    onClick={handleViewInHistory}
                  >
                    View in History
                  </Button>
                </Group>
              )}
            </Group>
            <Group gap="lg">
              <Checkbox
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.currentTarget.checked)}
                label={<Text size="sm">Auto-scroll</Text>}
              />
              <Button
                variant="subtle"
                size="sm"
                leftSection={<IconCopy size={14} />}
                onClick={handleCopyAll}
              >
                Copy All
              </Button>
            </Group>
          </Group>
          <ScrollArea flex={1} p="md">
            <Stack gap={4} style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {filteredLogs.map((log, index) => (
                <Group key={index} gap="sm" wrap="nowrap" align="flex-start">
                  <Text c="dimmed" size="sm" style={{ flexShrink: 0 }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Text>
                  <Badge
                    color={levelColors[log.level]}
                    variant="light"
                    size="sm"
                    tt="uppercase"
                    style={{ flexShrink: 0 }}
                  >
                    {log.level}
                  </Badge>
                  <Text size="sm" c={levelColors[log.level]}>
                    {log.message}
                  </Text>
                </Group>
              ))}
            </Stack>
          </ScrollArea>
        </Card>
      </Grid.Col>
    </Grid>
  );
}
