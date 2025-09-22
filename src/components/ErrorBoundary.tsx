import React from 'react';

type Props = {
  children: React.ReactNode;
  /** When any value in this array changes, the boundary resets */
  resetKeys?: any[];
};

type State = { hasError: boolean; message?: string };

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: any) {
    return { hasError: true, message: err?.message || String(err) };
  }

  componentDidCatch(error: any, info: any) {
    console.error('ErrorBoundary caught:', error, info);
  }

  componentDidUpdate(prevProps: Props) {
    // If reset keys changed (e.g., groupId, route), clear the error state
    const { resetKeys = [] } = this.props;
    const prevKeys = prevProps.resetKeys ?? [];
    const changed =
      resetKeys.length !== prevKeys.length ||
      resetKeys.some((v, i) => v !== prevKeys[i]);
    if (changed && this.state.hasError) {
      this.setState({ hasError: false, message: undefined });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-sm text-amber-300">
          Something went wrong rendering the app.
          <div className="mt-2 text-xs text-slate-400">{this.state.message}</div>
          <button
            className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100"
            onClick={this.handleReset}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
