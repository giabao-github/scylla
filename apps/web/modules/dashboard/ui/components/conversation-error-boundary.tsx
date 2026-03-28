"use client";

import { Component, ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

export class ConversationErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  private getErrorMessage(): string {
    const error = this.state.error as any;
    const code = error?.data?.code;

    if (code === "UNAUTHORIZED") {
      return "You don't have permission to view this conversation.";
    }
    if (code === "NOT_FOUND") {
      return "This conversation is no longer available.";
    }
    return "An error occurred while loading this conversation.";
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      "ConversationErrorBoundary has caught an error:",
      error,
      errorInfo,
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col gap-y-16 justify-center items-center h-full"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-muted-foreground">{this.getErrorMessage()}</p>
          <div
            className="dino-loader [--dino-loader-height:140px]"
            aria-hidden="true"
          >
            <div className="dino-runner"></div>
            <div className="dino-obstacle"></div>
            <div className="dino-ground"></div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/conversations">Go to conversations</Link>
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
