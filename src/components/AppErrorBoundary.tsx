import { Component, type ErrorInfo, type ReactNode } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App startup error", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
          <section className="w-full max-w-sm space-y-3 rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm">
            <h1 className="text-xl font-semibold">Swift Muv could not start</h1>
            <p className="text-sm text-muted-foreground">
              Close and reopen the app. If this continues, update the app to the latest build.
            </p>
            <p className="break-words rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {this.state.error.message}
            </p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;