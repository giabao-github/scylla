"use client";

import { Component, ReactNode } from "react";

import { Button } from "@workspace/ui/components/button";
import Link from "next/link";

interface ConvexErrorWithCode extends Error {
  data?: { code?: string };
}

const PERSISTENT_ERROR_CODES = new Set(["UNAUTHORIZED", "NOT_FOUND"]);

export class ConversationErrorBoundary extends Component<
  { children: ReactNode },
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

  private isConvexErrorWithCode(
    error: Error | null,
  ): error is ConvexErrorWithCode {
    return (
      error !== null &&
      "data" in error &&
      (error.data === undefined ||
        (typeof error.data === "object" && error.data !== null))
    );
  }

  private get errorCode(): string | undefined {
    return this.isConvexErrorWithCode(this.state.error)
      ? this.state.error.data?.code
      : undefined;
  }

  private get isPersistentError(): boolean {
    return this.errorCode ? PERSISTENT_ERROR_CODES.has(this.errorCode) : false;
  }

  private getErrorMessage(): string {
    if (this.errorCode === "INTERNAL") {
      return "Something went wrong. Please try again.";
    }
    if (this.isPersistentError) {
      return "This conversation is not available.";
    }
    return "An error occurred while loading this conversation.";
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
          {this.isPersistentError ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/conversations">Go to conversations</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </Button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
