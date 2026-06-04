import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
            <span className="text-sm text-base-500">Preview unavailable</span>
            <button
              onClick={this.handleRetry}
              className="px-3 py-1.5 text-xs font-medium text-accent hover:bg-base-800 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}