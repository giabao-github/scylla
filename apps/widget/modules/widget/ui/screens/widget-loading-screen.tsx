"use client";

import { useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import {
  contactSessionIdAtom,
  errorMessageAtom,
  loadingMessageAtom,
  organizationIdAtom,
  widgetScreenAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { useAction, useConvex } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";

type InitStep = "organization" | "session" | "settings" | "vapi" | "done";

export const WidgetLoadingScreen = ({
  organizationId,
}: {
  organizationId: string | null;
}) => {
  const [step, setStep] = useState<InitStep>("organization");
  const [sessionValid, setSessionValid] = useState(false);

  const loadingMessage = useAtomValue(loadingMessageAtom);
  const setOrganizationId = useSetAtom(organizationIdAtom);
  const setLoadingMessage = useSetAtom(loadingMessageAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setScreen = useSetAtom(widgetScreenAtom);

  const contactSessionId = useAtomValue(contactSessionIdAtom);

  // Step 1: Validate organization
  const validateOrganization = useAction(api.public.organizations.validate);

  useEffect(() => {
    if (step !== "organization") {
      return;
    }

    let cancelled = false;
    setLoadingMessage("Finding organization ID...");

    if (!organizationId) {
      setErrorMessage("Organization ID is required");
      setScreen(WIDGET_SCREENS.ERROR);
      return;
    }

    setLoadingMessage("Verifying organization...");

    validateOrganization({ organizationId })
      .then((result) => {
        if (cancelled) {
          return;
        }
        if (result.valid) {
          setOrganizationId(organizationId);
          setStep("session");
        } else {
          setErrorMessage(result.reason || "Invalid configuration");
          setScreen(WIDGET_SCREENS.ERROR);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setErrorMessage("Unable to verify organization");
        setScreen(WIDGET_SCREENS.ERROR);
      });

    return () => {
      cancelled = true;
    };
  }, [
    step,
    organizationId,
    setScreen,
    setOrganizationId,
    setStep,
    setLoadingMessage,
    setErrorMessage,
    validateOrganization,
  ]);

  // Step 2: Validate session (if exists)
  const convex = useConvex();

  useEffect(() => {
    if (step !== "session") {
      return;
    }

    let cancelled = false;
    setLoadingMessage("Finding contact session ID...");

    if (!contactSessionId) {
      setSessionValid(false);
      setStep("done");
      return;
    }

    setLoadingMessage("Validating session...");

    convex
      .query(api.public.contactSessions.validate, { contactSessionId })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setSessionValid(result.valid);
        setStep("done");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        console.warn(
          "Session validation failed, redirecting to authentication screen",
        );
        setSessionValid(false);
        setStep("done");
      });

    return () => {
      cancelled = true;
    };
  }, [step, contactSessionId, convex, setLoadingMessage]);

  useEffect(() => {
    if (step !== "done") {
      return;
    }

    const hasValidSession = sessionValid && contactSessionId;
    setScreen(hasValidSession ? WIDGET_SCREENS.SELECTION : WIDGET_SCREENS.AUTH);
  }, [step, contactSessionId, sessionValid, setScreen]);

  return (
    <div className="flex flex-col flex-1 gap-y-6 justify-center items-center p-4 text-muted-foreground">
      <div className="loader"></div>
      <p>{loadingMessage || "Loading..."}</p>
    </div>
  );
};
