import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";

interface ErrorDisplayProps {
  error: unknown;
}

const parseErrorMessage = (error: unknown): { title: string; description: string } => {
  if (error instanceof Error) {
    try {
      // Try to parse the error message as JSON
      const parsed = JSON.parse(error.message);
      if (parsed.error?.message) {
        return {
          title: "API Error",
          description: parsed.error.message
        };
      }
    } catch {
      // If parsing fails, use the error message as is
    }
    return {
      title: error.name || "Error",
      description: error.message
    };
  }
  
  if (typeof error === 'string') {
    return {
      title: "Error",
      description: error
    };
  }
  
  return {
    title: "Unknown Error",
    description: "An unexpected error occurred"
  };
};

const ErrorDisplay = ({ error }: ErrorDisplayProps) => {
  const { title, description } = parseErrorMessage(error);
  
  // Convert markdown-style links to HTML
  const formattedDescription = description.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
  );

  return (
    <Alert variant="destructive">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription 
        className="mt-1"
        dangerouslySetInnerHTML={{ __html: formattedDescription }}
      />
    </Alert>
  );
};

export default ErrorDisplay;
