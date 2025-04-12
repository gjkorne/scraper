import { useState } from 'react';
import { Link2, Loader2, X, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { ScrapedData } from '../types';

// Define error types for better handling
type ErrorType = 'invalid_url' | 'unsupported_site' | 'rate_limit' | 'network' | 'server' | 'parsing' | 'auth' | 'unknown';

interface ErrorState {
  type: ErrorType;
  message: string;
  details?: string;
  suggestion?: string;
}

interface JobFormProps {
  onSubmit: (url: string, data: ScrapedData) => void;
}

export function JobForm({ onSubmit }: JobFormProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [bypassCache, setBypassCache] = useState(false);

  // Basic URL validation
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };
  
  // Handle URL input change
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    
    // Only validate if there's a value and not while typing
    if (newUrl && !validateUrl(newUrl)) {
      setIsValidUrl(false);
    } else {
      setIsValidUrl(true);
    }
  };

  // Detect error type from response or error object
  const getErrorTypeFromResponse = async (response: Response): Promise<ErrorState> => {
    try {
      const data = await response.json();
      
      if (data.type === 'UNSUPPORTED_PLATFORM') {
        return {
          type: 'unsupported_site',
          message: 'This job site is not currently supported',
          details: data.message || 'We cannot automatically fetch job details from this site.',
          suggestion: data.message || 'Try using LinkedIn or the company\'s direct careers page.'
        };
      }
      
      if (response.status === 429) {
        return {
          type: 'rate_limit',
          message: 'Too many requests',
          details: 'We\'ve hit rate limits on the job site.',
          suggestion: 'Please wait a few minutes before trying again.'
        };
      }
      
      if (response.status === 401 || response.status === 403) {
        return {
          type: 'auth',
          message: 'Authentication error',
          details: 'Unable to authenticate with the scraper service.',
          suggestion: 'Please refresh the page and try again.'
        };
      }
      
      if (data.error && data.details) {
        return {
          type: 'parsing',
          message: data.error,
          details: data.details,
          suggestion: data.suggestion || 'Please ensure the URL points to a public job posting.'
        };
      }
      
      return {
        type: 'server',
        message: 'Server error',
        details: `Status code: ${response.status}`,
        suggestion: 'Our server had trouble processing your request. Please try again later.'
      };
    } catch {
      return {
        type: 'unknown',
        message: 'Failed to fetch job details',
        suggestion: 'Please try again or enter job details manually.'
      };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Additional validation
    if (!url) {
      setError({
        type: 'invalid_url',
        message: 'Please enter a URL',
        suggestion: 'Paste a job posting URL from LinkedIn, Greenhouse, or other job sites.'
      });
      return;
    }
    
    if (!validateUrl(url)) {
      setError({
        type: 'invalid_url',
        message: 'Invalid URL format',
        suggestion: 'Please enter a complete URL including http:// or https://'
      });
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-job`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url,
          bypass_cache: bypassCache 
        }),
      });

      if (!response.ok) {
        const errorState = await getErrorTypeFromResponse(response);
        setError(errorState);
        return;
      }

      const data: ScrapedData = await response.json();
      
      // Validate required fields in response
      if (!data.title || !data.company || !data.description) {
        setError({
          type: 'parsing',
          message: 'Incomplete job details',
          details: 'We couldn\'t extract all the required information from this job posting.',
          suggestion: 'Try a different URL or enter the job details manually.'
        });
        return;
      }
      
      onSubmit(url, data);
      setUrl('');
      setBypassCache(false);
    } catch (err) {
      // Handle network errors
      setError({
        type: 'network',
        message: 'Network error',
        details: err instanceof Error ? err.message : 'Unknown error',
        suggestion: 'Please check your internet connection and try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="Paste job posting URL"
                className={`w-full pl-10 pr-4 py-2 border ${!isValidUrl || error?.type === 'invalid_url' ? 'border-red-300 bg-red-50' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                required
              />
            </div>
            {!isValidUrl && url && (
              <p className="mt-1 text-xs text-red-500">
                Please enter a valid URL (e.g., https://example.com/job)
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Scanning...
              </>
            ) : (
              'Import Job'
            )}
          </button>
        </div>

        <div className="flex items-center mt-1">
          <label className="flex items-center text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={bypassCache}
              onChange={() => setBypassCache(!bypassCache)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 mr-2"
            />
            <RefreshCw className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
            Bypass cache (fetch fresh data)
          </label>
          <span className="ml-2 text-xs text-gray-500">
            Use this if the job listing has changed recently
          </span>
        </div>
      </div>
      
      {error && (
        <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
          error.type === 'unsupported_site' || error.type === 'invalid_url' 
            ? 'bg-yellow-50 border border-yellow-200' 
            : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex-shrink-0 mt-0.5">
            {error.type === 'unsupported_site' || error.type === 'invalid_url' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <h3 className={`text-sm font-medium ${
                error.type === 'unsupported_site' || error.type === 'invalid_url'
                  ? 'text-yellow-800' 
                  : 'text-red-800'
              }`}>
                {error.message}
              </h3>
              <button 
                onClick={clearError}
                className="text-gray-400 hover:text-gray-500"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {error.details && (
              <p className="mt-1 text-sm text-gray-600">{error.details}</p>
            )}
            {error.suggestion && (
              <div className="mt-2 flex gap-1.5 text-sm text-gray-700">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p>{error.suggestion}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </form>
  );
}