# Tool Testing Guide

This guide provides detailed information about how different types of tool inputs should be handled in the MCP Inspector, along with common testing scenarios and validation rules.

## Input Type Handling

| Type | Example Schema | Expected Input | Form Behavior | Notes |
|------|---------------|----------------|---------------|--------|
| `integer` | `{ "type": "integer" }` | `42` | Number input with step=1 | Must be whole number, no decimals |
| `number` | `{ "type": "number" }` | `42.5` | Number input | Can include decimals |
| `string` | `{ "type": "string" }` | `"hello"` | Text input | Standard text field |
| `boolean` | `{ "type": "boolean" }` | `true`/`false` | Checkbox | Toggle between true/false |
| `null` | `{ "type": "null" }` | `null` | N/A | Typically used in unions |

## Optional Parameters

| Scenario | Schema | Expected Behavior | Example |
|----------|--------|------------------|---------|
| Optional field unset | `{ "type": "string", "required": false }` | Parameter omitted from request | `{}` |
| Optional field set to null | `{ "type": ["string", "null"] }` | Parameter included as null | `{ "field": null }` |
| Required field | `{ "type": "string", "required": true }` | Must have value | `{ "field": "value" }` |

## Complex Objects

| Structure | Example Schema | Form Rendering | Example Input |
|-----------|---------------|----------------|---------------|
| Simple Object | ```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "age": { "type": "integer" }
  }
}
``` | Individual fields | ```json
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
``` | Expandable sections | ```json
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
``` | Dynamic list with Add/Remove | ```json
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
