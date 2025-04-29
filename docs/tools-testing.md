# Tool Testing Guide

This guide explains how different types of tool inputs are expected be handled in the MCP Inspector.  (Note that this guide currently only covers testing using the UI and not CLI mode.)

The Tools UI provides both structured form and raw JSON editor modes.  For supported types, the UI allows switching between modes while preserving values, with some exceptions for [complex objects](#complex-objects).  Input types are validated in both modes.

## Input Type Handling

### Basic Types

| Type | Example Schema | Expected Input | Form Behavior |
|------|---------------|----------------|---------------|
| `integer` | `{ "type": "integer" }` | `42` | Number input with step=1 |
| `number` | `{ "type": "number" }` | `42.5` | Number input |
| `string` | `{ "type": "string" }` | `"hello"` | Text input |
| `boolean` | `{ "type": "boolean" }` | `true`/`false` | Checkbox |
| `null` | `{ "type": "null" }` | `null` | N/A |

### Type Conversion Rules

| Input Type | Target Type | Conversion Behavior | Example |
|------------|-------------|-------------------|---------|
| String → Integer | `integer` | Reject if not whole number | "42" → 42, "1.5" → error |
| Number → Integer | `integer` | Reject if not whole number | 42 → 42, 1.5 → error |
| String → Number | `number` | Convert if valid number | "42.5" → 42.5 |
| String → Boolean | `boolean` | Only accept "true"/"false" | "true" → true |

## Optional Parameters

**When an optional parameter is not set by the user:**
- The parameter will be completely omitted from the request
- Example: If `name` is optional and unset: `{}` will be sent in the request.

**When an optional parameter explicitly accepts null:**
- Schema must declare null as valid: `{ "type": ["string", "null"] }`
- Only then will null be sent: `{ "name": null }`

**When an optional string is set to empty:**
- Empty string will be sent, eg: `{ "name": "" }`

## Complex Objects

TODO

## Common Testing Scenarios and Expected Results for Complex Objects

| Test Case | Description | Expected Behavior |
|-----------|-------------|------------------|
| Complex nested form | Tool with nested objects | Only JSON mode is available |
| Array field manipulation | Add/remove items in array | Dynamic list updates correctly |
