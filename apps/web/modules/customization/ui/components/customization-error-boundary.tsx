"use client";

import { Component, type ReactNode } from "react";

import { AlertTriangleIcon } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

export class CustomizationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "CustomizationErrorBoundary has caught an error:",
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col flex-1 gap-y-4 justify-center items-center p-8 min-h-0 bg-white"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex gap-x-2 items-center">
            <AlertTriangleIcon
              className="text-rose-500 size-5"
              aria-hidden="true"
            />
            <span className="text-sm text-rose-500">
              Error loading widget settings.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => this.setState({ hasError: false })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
