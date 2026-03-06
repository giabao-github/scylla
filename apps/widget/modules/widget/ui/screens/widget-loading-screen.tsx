"use client";

import { useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import { useAction, useMutation } from "convex/react";
import { useAtomValue, useSetAtom } from "jotai";

import {
  contactSessionIdAtomFamily,
  errorMessageAtom,
  loadingMessageAtom,
  organizationIdAtom,
  widgetScreenAtom,
} from "@/modules/widget/atoms/widget-atoms";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

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

  const contactSessionId = useAtomValue(
    contactSessionIdAtomFamily(organizationId || ""),
  );

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
      setScreen("error");
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
          setScreen("error");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setErrorMessage("Unable to verify organization");
        setScreen("error");
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
  const validateContactSession = useMutation(
    api.public.contactSessions.validate,
  );

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

    validateContactSession({ contactSessionId })
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
        setSessionValid(false);
        setStep("done");
      });

    return () => {
      cancelled = true;
    };
  }, [step, contactSessionId, validateContactSession, setLoadingMessage]);

  useEffect(() => {
    if (step !== "done") {
      return;
    }

    const hasValidSession = sessionValid && contactSessionId;
    setScreen(hasValidSession ? "selection" : "auth");
  }, [step, contactSessionId, sessionValid, setScreen]);

  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col gap-y-2 justify-between px-2 py-6 font-semibold">
          <p className="text-3xl">Hi there! 👋</p>
          <p className="text-lg">Let&apos;s get you started.</p>
        </div>
      </WidgetHeader>

      <div className="flex flex-col flex-1 gap-y-6 justify-center items-center p-4 text-muted-foreground">
        <div className="loader"></div>
        <p>{loadingMessage || "Loading..."}</p>
      </div>
    </>
  );
};
