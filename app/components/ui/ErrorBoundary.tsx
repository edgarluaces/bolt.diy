import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorCount: number;
}

// Known transient DOM errors that can be auto-recovered
const TRANSIENT_ERROR_PATTERNS = [
  'insertBefore',
  'removeChild',
  'appendChild',
  'replaceChild',
  'not a child',
  'no es un hijo',
];

function isTransientDOMError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()));
}

/**
 * ErrorBoundary to catch React DOM errors during streaming
 * Prevents the entire app from crashing when insertBefore errors occur
 */
export class ErrorBoundary extends Component<Props, State> {
  private _recoveryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
    // Log the error but don't crash
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ErrorBoundary] Caught error:', error.message);
    }

    // Auto-recover for transient DOM errors
    if (isTransientDOMError(error)) {
      // Clear any pending recovery
      if (this._recoveryTimeout) {
        clearTimeout(this._recoveryTimeout);
      }

      // Immediate recovery for DOM errors
      this._recoveryTimeout = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: undefined,
          errorCount: prev.errorCount + 1,
        }));
      }, 50);
    }
  }

  componentWillUnmount() {
    if (this._recoveryTimeout) {
      clearTimeout(this._recoveryTimeout);
    }
  }

  render() {
    if (this.state.hasError) {
      // For transient errors, render nothing briefly (will auto-recover)
      if (this.state.error && isTransientDOMError(this.state.error)) {
        return null;
      }

      // For other errors, use fallback
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
