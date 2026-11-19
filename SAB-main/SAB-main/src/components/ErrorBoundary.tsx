import React from 'react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] text-[#1C1917] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E6E0D6] p-8 space-y-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8C6D46]">SAB Jewelry</p>
            <h1 className="font-display text-3xl font-semibold">Something needs attention</h1>
            <p className="text-sm text-[#57534E] leading-relaxed">
              We ran into an unexpected application issue. Please reload the page to continue browsing.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#1C1917] text-[#FAF8F5] text-sm font-medium hover:bg-[#332E2A] transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
