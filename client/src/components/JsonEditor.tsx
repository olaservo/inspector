import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';
import { Button } from "@/components/ui/button";

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
}

const JsonEditor = ({ value, onChange, error, placeholder }: JsonEditorProps) => {
  const formatJson = (json: string): string => {
    try {
      const parsed = JSON.parse(json);
      // If it's an empty array and we have a placeholder, return empty string to show placeholder
      if (Array.isArray(parsed) && parsed.length === 0 && placeholder) {
        return '';
      }
      return JSON.stringify(parsed, null, 2);
    } catch {
      return json;
    }
  };

  // Format the initial value
  const formattedValue = value.trim() === '' ? '' : formatJson(value);

  return (
    <div className="relative space-y-2">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(formatJson(value))}
        >
          Format JSON
        </Button>
      </div>
      <div className="relative">
        <div
          className={`border rounded-md ${
            error ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'
          }`}
        >
          <Editor
            value={formattedValue}
            onValueChange={(newValue) => {
              // If the new value is empty or whitespace, pass empty string
              if (!newValue.trim()) {
                onChange('');
                return;
              }
              // Otherwise pass the new value
              onChange(newValue);
            }}
            highlight={code =>
              Prism.highlight(code, Prism.languages.json, 'json')
            }
            padding={10}
            style={{
              fontFamily: '"Fira code", "Fira Mono", monospace',
              fontSize: 14,
              backgroundColor: 'transparent',
              minHeight: '200px',
            }}
            className="w-full"
          />
        </div>
        {placeholder && !formattedValue && (
          <div 
            className="absolute inset-0 pointer-events-none p-[10px] text-gray-400 dark:text-gray-600 font-['Fira_code',_'Fira_Mono',_monospace] text-[14px]"
            style={{ whiteSpace: 'pre' }}
          >
            {placeholder}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export default JsonEditor;
