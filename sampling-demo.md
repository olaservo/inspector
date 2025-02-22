# Simple Sampling Demo using MCP Inspector + OpenRouter

This branch of MCP Inspector includes an example implementation of [Sampling](https://modelcontextprotocol.io/docs/concepts/sampling).

## How it works:

- After the sampling request is approved by the user, the client passes along any information that the selected Sampling Strategy should use to select a model.
- For the OpenRouter Strategy example, this includes which models are allowed, as well as each model's relative scores for intelligence, speed, and cost.
- The Sampling Strategy (as defined by a proof-of-concept library called [mcp-sampling-service](https://github.com/olaservo/mcp-sampling-service)) decides how the model is selected when sampling from an LLM.

## Demo video:

[![Watch a quick demo here](https://img.youtube.com/vi/FK7OcDCm6Lg/0.jpg)](https://www.youtube.com/watch?v=FK7OcDCm6Lg)

## How to run it:

This demo requires an [OpenRouter](https://openrouter.ai/) API Key.  OpenRouter was used for this example because it provides a wide range of models from multiple providers.

1. Clone this repo and switch to this branch
2. Follow the instructions from the main [README.md](README.md) to set up your dev environment.
3. When you run your dev environment, you need to pass your `OPENROUTER_API_KEY` to the app.  For example, you can run `$env:OPENROUTER_API_KEY="<your-api-key>"; npm run dev:windows` if you are on Windows.  The recommended approach to run the demo is to use an environment variable for your API Key, although there is also a config file option that you can set in the UI once the app is running.
4. Once the MCP Inspector app is running, make sure you connect to either the server `@dandeliongold/server-everything` or another server that allows you to test making a sampling request.  The next steps assume you are using this server which includes an enhanced version of the `sampleLLM` tool.
5. Go to the **Sampling** tab and select the **OpenRouter Strategy**. If your API key is configured correctly, then the UI should show a message about using the environment variable.
6. Go to the **Tools** tab and click the **List Tools** button, then click the `sampleLLM` tool.
7. Type something into the prompt field.
8. Set some values for `modelPreferences` and/or `hints`.
9. Click the "Run Tool" button, then approve the sampling request in the Sampling tab.
10. Once the red notification dot disappears after approving the request, the sampling response should show up under the sampleLLM tool input fields.