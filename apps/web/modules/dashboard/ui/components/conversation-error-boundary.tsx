"use client";

import { Component, ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";

export class ConversationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "ConversationErrorBoundary has caught an error:",
      error,
      errorInfo,
    );
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col justify-center items-center h-full">
          <p className="text-muted-foreground">
            This conversation no longer exists
          </p>
          <div className="dino-loader [--dino-loader-height:200px]">
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
