import { test, expect } from '@playwright/test';

test.describe('Connect MCP Server Using stdio In Inspector UI', () => {

  test('should connect to test server using stdio and verify echo tool', async ({ page }) => {
    // Load the inspector UI
    await page.goto('/');

    // Set transport type in localStorage (stdio is default, no URL needed)
    await page.evaluate(() => {
      localStorage.setItem('lastTransportType', 'stdio');
    });
    await page.reload();

    // Collect all console messages
    // TODO: History entries are more well-structured/predictable and useful here than raw console output
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Wait for and click connect button
    const connectButton = await page.waitForSelector('[data-testid="connect-button"]', { state: 'visible' });
    await connectButton.click();

    // Wait for connection status to show connected and verify
    const connectedText = page.getByText('Connected');
    await expect(connectedText).toBeVisible({ timeout: 10000 });

    // Navigate to Tools tab and wait for it to be active
    const toolsTab = page.getByRole('tab', { name: 'Tools' });
    await toolsTab.click();
    await expect(toolsTab).toHaveAttribute('aria-selected', 'true');

    // Click the List Tools button to load available tools
    const listToolsButton = page.getByRole('button', { name: 'List Tools' });
    await expect(listToolsButton).toBeVisible();
    await listToolsButton.click();

    // Wait for tools list to be loaded and verify echo tool exists
    const echoTool = page.getByText('echo', { exact: true });
    await expect(echoTool).toBeVisible({ timeout: 5000 });
    await echoTool.click();

    // Wait for message input to be available
    const messageInput = page.getByLabel('message');
    await expect(messageInput).toBeVisible();
    await messageInput.fill('Hello MCP!');

    // Call the tool and wait for response
    const callButton = page.getByRole('button', { name: 'Run Tool' });
    await expect(callButton).toBeEnabled();
    await callButton.click();

    // Verify the response with increased timeout
    await expect(page.getByText('Echo: Hello MCP!')).toBeVisible({ timeout: 10000 });
  });
});
