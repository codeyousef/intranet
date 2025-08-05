'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class NewsletterErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error for debugging
    console.error('Newsletter rendering error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    // Reset the error boundary state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Call the retry function if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI when there's a rendering error
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
            {this.props.fallbackTitle || 'Newsletter Display Error'}
          </h3>
          <p className="text-red-600 dark:text-red-400 text-center mb-4 max-w-md">
            There was an issue displaying the newsletter content. This might be due to formatting issues in the original content.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-sm text-red-800 dark:text-red-200 max-w-full overflow-auto">
              <summary className="cursor-pointer font-medium">Error Details (Development Only)</summary>
              <div className="mt-2 whitespace-pre-wrap">
                <strong>Error:</strong> {this.state.error.message}
                {this.state.errorInfo && (
                  <>
                    <br /><br />
                    <strong>Component Stack:</strong>
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </div>
            </details>
          )}
          
          <div className="flex space-x-3">
            <Button
              onClick={this.handleRetry}
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="outline"
              className="border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Reload Page
            </Button>
          </div>
          
          <p className="text-xs text-red-500 dark:text-red-400 mt-4 text-center">
            If this problem persists, please contact IT support.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default NewsletterErrorBoundary;