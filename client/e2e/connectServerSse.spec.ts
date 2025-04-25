import { test, expect } from '@playwright/test';

test.describe('Connect MCP Server Using SSE In Inspector UI', () => {

  test('should connect to test server using SSE and verify PING tool', async ({ page }) => {
    // Load the inspector UI
    await page.goto('/');

    // Set server URL and transport type in localStorage
    // TODO: add test for setting in UI too
    await page.evaluate(() => {
      localStorage.setItem('lastSseUrl', 'http://localhost:3001/sse');
      localStorage.setItem('lastTransportType', 'sse');
    });
    await page.reload();

    // Collect all console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });

    // Click connect and verify initial disconnected state  
    const connectButton = await page.waitForSelector('[data-testid="connect-button"]');
    await connectButton.click();

    // Wait for connection status to show connected
    await expect(page.getByText('Connected')).toBeVisible();

    // Navigate to Tools tab
    await page.getByRole('tab', { name: 'Tools' }).click();

    // Wait for the echo tool to appear and select it
    await page.getByText('echo', { exact: true }).click();

    // Enter a test message
    await page.getByLabel('message').fill('Hello MCP!');

    // Call the tool
    await page.getByRole('button', { name: 'Call Tool' }).click();

    // Verify the response
    await expect(page.getByText('Echo: Hello MCP!')).toBeVisible();

    // TODO Verify console messages
    //expect(consoleMessages).toContainEqual(expect.stringContaining('401 (Unauthorized)'));
  });
});
