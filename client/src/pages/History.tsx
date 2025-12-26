import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  Stack,
  Text,
  Title,
  Badge,
  Group,
  Button,
  TextInput,
  Select,
  ScrollArea,
  Switch,
} from '@mantine/core';
import {
  IconPinnedOff,
  IconDownload,
  IconList,
  IconHierarchy,
} from '@tabler/icons-react';
import { initialHistory, type HistoryEntry } from '@/mocks';
import { HistoryTreeNode } from '@/components/HistoryTreeNode';
import { getRootEntries, buildChildrenMap } from '@/lib/historyUtils';

// Pagination page size
const PAGE_SIZE = 10;

export function History() {
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showNested, setShowNested] = useState(true);

  // Auto-expand and scroll to highlighted entry from query param
  useEffect(() => {
    if (highlightId) {
      // Add the highlighted entry to expanded set
      setExpandedIds((prev) => {
        if (prev.has(highlightId)) return prev;
        const next = new Set(prev);
        next.add(highlightId);
        return next;
      });

      // Clear the highlight param after processing (optional: keeps URL clean)
      // Uncomment below if you want to clear the param after expansion:
      // setSearchParams({}, { replace: true });
    }
  }, [highlightId]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const togglePin = (id: string) => {
    setHistory((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, pinned: !entry.pinned } : entry
      )
    );
  };

  const handleClearAll = () => {
    setHistory([]);
  };

  // Export history as JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `mcp-history-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load more entries
  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  };

  // Build children map for tree view
  const childrenMap = buildChildrenMap(history);

  // Filter function for entries
  const matchesFilter = (entry: HistoryEntry) => {
    const matchesSearch =
      searchFilter === '' ||
      entry.method.toLowerCase().includes(searchFilter.toLowerCase()) ||
      entry.target?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      JSON.stringify(entry.params).toLowerCase().includes(searchFilter.toLowerCase());
    const matchesMethod = !methodFilter || methodFilter === 'all' || entry.method === methodFilter;
    return matchesSearch && matchesMethod;
  };

  // Get entries to display based on view mode
  const getDisplayEntries = () => {
    if (showNested) {
      // In nested mode, only show root entries (parents)
      // Children will be rendered as part of their parent's tree
      return getRootEntries(history).filter(matchesFilter);
    } else {
      // In flat mode, show all entries that match the filter
      return history.filter(matchesFilter);
    }
  };

  const filteredHistory = getDisplayEntries();

  // Separate pinned and unpinned (only root/primary requests can be pinned)
  const pinnedEntries = filteredHistory.filter((entry) => entry.pinned);
  const unpinnedEntries = filteredHistory.filter((entry) => !entry.pinned);

  // Paginate unpinned entries
  const visibleUnpinnedEntries = unpinnedEntries.slice(0, visibleCount);
  const hasMoreEntries = unpinnedEntries.length > visibleCount;

  return (
    <ScrollArea h="calc(100vh - 120px)">
      <Stack gap="lg">
        {/* Header */}
        <Card withBorder>
          <Group justify="space-between" p="md">
            <Title order={4}>Request History</Title>
            <Group gap="sm">
              <TextInput
                placeholder="Search..."
                size="sm"
                w={200}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
              <Select
                size="sm"
                w={160}
                placeholder="Filter by method"
                clearable
                value={methodFilter}
                onChange={setMethodFilter}
                data={[
                  { value: 'all', label: 'All methods' },
                  { value: 'tools/call', label: 'tools/call' },
                  { value: 'tools/list', label: 'tools/list' },
                  { value: 'resources/read', label: 'resources/read' },
                  { value: 'prompts/get', label: 'prompts/get' },
                  { value: 'sampling/createMessage', label: 'sampling' },
                  { value: 'elicitation/create', label: 'elicitation' },
                ]}
              />
              <Switch
                size="sm"
                checked={showNested}
                onChange={(e) => setShowNested(e.currentTarget.checked)}
                label="Nested"
                onLabel={<IconHierarchy size={12} />}
                offLabel={<IconList size={12} />}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                leftSection={<IconDownload size={14} />}
              >
                Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All
              </Button>
            </Group>
          </Group>
        </Card>

        {/* History entries */}
        {unpinnedEntries.length === 0 && pinnedEntries.length === 0 ? (
          <Card withBorder>
            <Text c="dimmed" ta="center" py="xl">
              No history entries
            </Text>
          </Card>
        ) : (
          <Stack gap="sm">
            {visibleUnpinnedEntries.map((entry, index) => (
              <HistoryTreeNode
                key={entry.id}
                entry={entry}
                children={showNested ? (childrenMap.get(entry.id) ?? []) : []}
                isLast={index === visibleUnpinnedEntries.length - 1}
                expanded={expandedIds.has(entry.id)}
                onToggleExpand={() => toggleExpand(entry.id)}
                onTogglePin={() => togglePin(entry.id)}
              />
            ))}
            {/* Load More button */}
            {hasMoreEntries && (
              <Group justify="center" pt="sm">
                <Button variant="outline" onClick={handleLoadMore}>
                  Load More ({unpinnedEntries.length - visibleCount} remaining)
                </Button>
              </Group>
            )}
          </Stack>
        )}

        {/* Pinned Requests Section */}
        {pinnedEntries.length > 0 && (
          <Stack gap="sm">
            <Title order={5}>Pinned Requests ({pinnedEntries.length})</Title>
            <Card withBorder>
              <Stack gap={0} p="md">
                {pinnedEntries.map((entry) => (
                  <Group
                    key={entry.id}
                    justify="space-between"
                    py="sm"
                    style={{ borderBottom: '1px solid var(--mantine-color-dark-4)' }}
                  >
                    <Group gap="sm">
                      <Text c="yellow">*</Text>
                      {entry.label && (
                        <Text size="sm" fw={500}>"{entry.label}"</Text>
                      )}
                      <Badge variant="light" size="xs">
                        {entry.method}
                      </Badge>
                      {entry.target && (
                        <Text size="sm" c="dimmed">{entry.target}</Text>
                      )}
                      <Text size="xs" c="dimmed">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Button variant="subtle" size="xs">
                        Replay
                      </Button>
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => togglePin(entry.id)}
                        leftSection={<IconPinnedOff size={14} />}
                      >
                        Unpin
                      </Button>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Card>
          </Stack>
        )}

        {/* Footer stats */}
        <Text size="sm" c="dimmed" ta="right">
          Showing {visibleUnpinnedEntries.length + pinnedEntries.length} of {filteredHistory.length} entries
          {filteredHistory.length !== history.length && ` (${history.length} total)`}
        </Text>
      </Stack>
    </ScrollArea>
  );
}
