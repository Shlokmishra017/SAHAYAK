import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-lg my-12 p-8 rounded-2xl border border-[#fae6e0] bg-white text-center shadow-lg animate-fade-in">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fae6e0] text-[#a55342] mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="font-serif text-xl font-semibold text-[#18342e] mb-2">
            Something went wrong
          </h2>
          <p className="text-xs text-[#788a84] mb-4 leading-relaxed">
            An unexpected client error occurred. Your on-device session state is safe.
          </p>
          <div className="text-[11px] font-mono bg-[#f8fbf9] p-3 rounded-xl border border-[#edf1ef] text-[#a55342] mb-5 break-all text-left">
            {this.state.error?.message || 'Unknown render error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#174c42] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#123e39] transition-colors"
          >
            <RefreshCw size={14} />
            <span>Reload Application</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;