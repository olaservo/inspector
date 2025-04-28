# Tool Testing Guide

This guide provides detailed information about how different types of tool inputs should be handled in the MCP Inspector, along with common testing scenarios and validation rules.

## Input Type Handling

### Basic Types

| Type | Example Schema | Expected Input | Form Behavior | Notes |
|------|---------------|----------------|---------------|--------|
| `integer` | `{ "type": "integer" }` | `42` | Number input with step=1 | Must be whole number, no decimals |
| `number` | `{ "type": "number" }` | `42.5` | Number input | Can include decimals |
| `string` | `{ "type": "string" }` | `"hello"` | Text input | Standard text field |
| `boolean` | `{ "type": "boolean" }` | `true`/`false` | Checkbox | Toggle between true/false |
| `null` | `{ "type": "null" }` | `null` | N/A | Typically used in unions |

### Integer Type Requirements

1. Form Input Requirements:
   - MUST use HTML `<input type="number">` with `step="1"`
   - MUST prevent decimal input via step validation
   - MUST display validation error for non-integer values
   - SHOULD support keyboard up/down for increment/decrement

2. Value Handling:
   - MUST convert string inputs to proper integer type
   - MUST reject decimal values (e.g., "1.5")
   - MUST reject scientific notation (e.g., "1e2")
   - MUST reject non-numeric strings (e.g., "abc")
   - MUST handle integer constraints:
     ```json
     {
       "type": "integer",
       "minimum": 0,
       "maximum": 100
     }
     ```

3. Request Payload:
   - MUST send as JSON number, not string
   - Correct: `{"count": 42}`
   - Incorrect: `{"count": "42"}`

### Type Conversion Rules

| Input Type | Target Type | Conversion Behavior | Example |
|------------|-------------|-------------------|---------|
| String → Integer | `integer` | Reject if not whole number | "42" → 42, "1.5" → error |
| Number → Integer | `integer` | Reject if not whole number | 42 → 42, 1.5 → error |
| String → Number | `number` | Convert if valid number | "42.5" → 42.5 |
| String → Boolean | `boolean` | Only accept "true"/"false" | "true" → true |

## Optional Parameters

### Parameter Handling Rules

1. When an optional parameter is not set by the user:
   - The parameter should be completely omitted from the request
   - Do NOT send the parameter as `null`
   - Example: If `name` is optional and unset: `{}` not `{"name": null}`

2. When an optional parameter explicitly accepts null:
   - Schema must declare null as valid: `{ "type": ["string", "null"] }`
   - Only then may null be sent: `{ "name": null }`

3. When an optional string is set to empty:
   - Empty string is sent: `{ "name": "" }`
   - Not omitted or set to null

| Scenario | Schema | Expected Behavior | Example | Notes |
|----------|--------|------------------|---------|-------|
| Optional field unset | `{ "type": "string", "required": false }` | Parameter omitted from request | `{}` | Do not send null |
| Optional field empty | `{ "type": "string", "required": false }` | Empty string sent | `{ "field": "" }` | For string types |
| Nullable field set to null | `{ "type": ["string", "null"] }` | Parameter included as null | `{ "field": null }` | Schema must allow null |
| Required field | `{ "type": "string", "required": true }` | Must have value | `{ "field": "value" }` | Never omitted |

### Validation Requirements

1. Schema Validation:
   - Validate optional fields match schema type
   - Ensure null is only allowed when specified
   - Respect required field constraints

2. Request Payload:
   - Omit unset optional parameters
   - Include empty strings when set
   - Only send null for nullable types

## Complex Objects

### Form Rendering Requirements

1. UI Components:
   - MUST provide both structured form AND raw JSON editor modes
   - MUST allow switching between modes while preserving values
   - MUST validate input in both modes
   - SHOULD default to structured form for better UX

2. Structured Form Features:
   - MUST use appropriate input types for each field
   - MUST show field labels and descriptions
   - MUST indicate required fields
   - MUST provide real-time validation
   - SHOULD group related fields logically

### Object Structure Types

| Structure | Example Schema | Form Rendering Requirements | Example Input |
|-----------|---------------|---------------------------|---------------|
| Simple Object | ```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer" }
  }
}
``` | - Render as fieldset
- Group related fields
- Show field labels
- Use appropriate input types | ```json
{
  "name": "John",
  "age": 30
}
``` |
| Nested Object | ```json
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "age": { "type": "integer" }
      }
    }
  }
}
``` | - Use collapsible sections
- Show object path in labels
- Allow expand/collapse all
- Maintain state on mode switch | ```json
{
  "user": {
    "name": "John",
    "age": 30
  }
}
``` |
| Array of Objects | ```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "quantity": { "type": "integer" }
    }
  }
}
``` | - Show Add/Remove buttons
- Support item reordering
- Collapsible array items
- Maintain array indices
- Show item count | ```json
[
  {
    "name": "Item 1",
    "quantity": 2
  },
  {
    "name": "Item 2",
    "quantity": 1
  }
]
``` |

### Complex Form Behaviors

1. Array Operations:
   - Add Item: Append new item with default values
   - Remove Item: Delete selected item and reindex
   - Reorder: Drag-and-drop support with index update
   - Validation: Validate array constraints (min/max items)

2. Nested Object Handling:
   - Path Display: Show full object path in labels
   - State Management: Preserve expand/collapse state
   - Validation: Validate at all nesting levels
   - Navigation: Provide breadcrumb navigation

3. Form State:
   - MUST preserve values when switching modes
   - MUST maintain validation state
   - MUST keep focus position when possible
   - SHOULD warn about unsaved changes

4. Error Handling:
   - Show errors at correct nesting level
   - Highlight invalid fields in context
   - Provide clear error messages
   - Support field-level and form-level validation

## Common Testing Scenarios

| Test Case | Description | Expected Behavior |
|-----------|-------------|------------------|
| Empty required field | Submit form with required field empty | Error shown, submission blocked |
| Invalid integer | Enter "1.5" in integer field | Value rounded or error shown |
| Complex nested form | Tool with nested objects and arrays | Structured form with proper nesting |
| Optional field handling | Leave optional field empty | Field omitted from request |
| Array manipulation | Add/remove items in array | Dynamic list updates correctly |

## Validation Rules

| Type | Validation Rules | Example Schema | Invalid Examples |
|------|-----------------|----------------|------------------|
| `integer` | - Must be whole number<br>- No decimals<br>- No scientific notation | `{ "type": "integer" }` | "1.5", "1e2", "abc" |
| `number` | - Can be integer or decimal<br>- Scientific notation allowed | `{ "type": "number" }` | "abc", "1,000" |
| `string` | - Any text value<br>- Empty string allowed unless required | `{ "type": "string" }` | N/A |
| `boolean` | - Must be true/false<br>- No truthy/falsy values | `{ "type": "boolean" }` | "true", 1, "yes" |

## Error Handling

| Error Scenario | Expected Behavior | Example |
|----------------|------------------|----------|
| Invalid type | Clear error message indicating type mismatch | "Expected integer, got string '1.5'" |
| Missing required field | Error highlighting missing field | "Required field 'name' is missing" |
| Invalid JSON in editor | Real-time validation error | "Invalid JSON: Unexpected token }" |
| Schema validation failure | Show which part of schema failed | "Value '1.5' at .age does not match integer type" |

## Best Practices

1. **Schema Design**
   - Use clear, descriptive property names
   - Include descriptions for complex fields
   - Mark required fields appropriately
   - Use proper types (e.g., `integer` vs `number`)

2. **Form Testing**
   - Test all input types
   - Verify required field validation
   - Check nested object rendering
   - Test array manipulation
   - Verify proper type conversion

3. **Error Handling**
   - Validate input types strictly
   - Provide clear error messages
   - Show validation in real-time
   - Handle optional fields correctly

4. **Complex Structures**
   - Test deeply nested objects
   - Verify array item handling
   - Check form/JSON mode switching
   - Validate complex schemas fully

## Troubleshooting

1. **Form Not Rendering Properly**
   - Check schema structure
   - Verify property types
   - Ensure required fields marked
   - Check nesting depth

2. **Type Conversion Issues**
   - Verify input type matches schema
   - Check number/integer handling
   - Validate string conversions
   - Test optional field handling

3. **Array Handling**
   - Test item addition/removal
   - Verify nested object arrays
   - Check array validation
   - Test empty array handling

4. **Optional Parameters**
   - Verify omission of undefined
   - Check null handling
   - Test required validation
   - Verify schema compliance
