import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * ErrorBoundary to catch React DOM errors during streaming
 * Prevents the entire app from crashing when insertBefore errors occur
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error but don't crash
    console.warn('ErrorBoundary caught error:', error.message);
    console.debug('Error info:', errorInfo);

    // Auto-recover after a short delay for transient DOM errors
    if (error.message.includes('insertBefore') || error.message.includes('removeChild')) {
      setTimeout(() => {
        this.setState({ hasError: false, error: undefined });
      }, 100);
    }
  }

  render() {
    if (this.state.hasError) {
      // Return fallback or nothing for transient errors
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
