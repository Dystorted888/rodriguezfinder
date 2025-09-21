import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: err?.message || String(err) };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-sm text-amber-300">
          Something went wrong rendering the app. Try reloading.
          <div className="mt-2 text-xs text-slate-400">{this.state.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
