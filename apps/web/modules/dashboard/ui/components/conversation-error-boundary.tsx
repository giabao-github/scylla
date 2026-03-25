"use client";

import { Component, ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";

export class ConversationErrorBoundary extends Component<
  { children: ReactNode; onReset?: () => void },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "ConversationErrorBoundary has caught an error:",
      error,
      errorInfo,
    );
  }

  reset = () => {
    try {
      this.props.onReset?.();
    } finally {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col justify-center items-center h-full"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-muted-foreground">
            {this.state.error?.message?.includes("permission") ||
            this.state.error?.message?.includes("access")
              ? "You don't have permission to view this conversation."
              : this.state.error?.message?.includes("not found")
                ? "This conversation is no longer available."
                : "An error occurred while loading this conversation."}
          </p>
          <div
            className="dino-loader [--dino-loader-height:200px]"
            aria-hidden="true"
          >
            <div className="dino-runner"></div>
            <div className="dino-obstacle"></div>
            <div className="dino-ground"></div>
          </div>
          <Button variant="ghost" size="sm" onClick={this.reset}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
