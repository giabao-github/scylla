"use client";

import { useEffect, useState } from "react";

import { api } from "@workspace/backend/_generated/api";
import {
  clerkOrganizationIdAtom,
  contactSessionIdAtom,
  errorMessageAtom,
  loadingMessageAtom,
  organizationIdAtom,
  organizationProfileAtom,
  widgetScreenAtom,
  widgetSettingsAtom,
} from "@workspace/shared/atoms/atoms";
import { WIDGET_SCREENS } from "@workspace/shared/constants/screens";
import { useAction, useConvex, useQuery } from "convex/react";
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
  const setClerkOrganizationId = useSetAtom(clerkOrganizationIdAtom);
  const setOrganizationId = useSetAtom(organizationIdAtom);
  const setOrganizationProfile = useSetAtom(organizationProfileAtom);
  const setWidgetSettings = useSetAtom(widgetSettingsAtom);
  const setLoadingMessage = useSetAtom(loadingMessageAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const setScreen = useSetAtom(widgetScreenAtom);

  const contactSessionId = useAtomValue(contactSessionIdAtom);
  const convex = useConvex();

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

    setClerkOrganizationId(organizationId);

    setLoadingMessage("Verifying organization...");

    validateOrganization({ organizationId })
      .then(async (result) => {
        if (cancelled) {
          return;
        }
        if (result.valid) {
          let organization;
          try {
            organization = await convex.query(
              api.public.organizations.getByClerkId,
              { clerkOrgId: result.clerkOrganizationId },
            );
          } catch (error) {
            if (cancelled) return;
            console.error("Failed to load organization details:", error);
            setErrorMessage("Unable to load organization details");
            setScreen(WIDGET_SCREENS.ERROR);
            return;
          }

          if (cancelled) return;

          setOrganizationId(result.id ?? null);
          setOrganizationProfile({
            clerkOrganizationId: result.clerkOrganizationId,
            name: result.name,
            imageUrl: result.imageUrl,
            createdAt: organization?._creationTime,
          });
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
    setClerkOrganizationId,
    setScreen,
    setOrganizationId,
    setOrganizationProfile,
    setStep,
    setLoadingMessage,
    setErrorMessage,
    convex,
    validateOrganization,
  ]);

  // Step 2: Validate session (if exists)
  useEffect(() => {
    if (step !== "session") {
      return;
    }

    let cancelled = false;
    setLoadingMessage("Finding contact session ID...");

    if (!contactSessionId) {
      setSessionValid(false);
      setStep("settings");
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
        setStep("settings");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        console.warn(
          "Session validation failed, redirecting to authentication screen",
        );
        setSessionValid(false);
        setStep("settings");
      });

    return () => {
      cancelled = true;
    };
  }, [step, contactSessionId, convex, setLoadingMessage]);

  // Step 3: Get widget settings
  const widgetSettings = useQuery(
    api.public.widgetSettings.getByOrganizationId,
    organizationId ? { organizationId } : "skip",
  );

  useEffect(() => {
    if (step !== "done") {
      return;
    }
    const hasValidSession = sessionValid && contactSessionId;
    setScreen(hasValidSession ? WIDGET_SCREENS.SELECTION : WIDGET_SCREENS.AUTH);
  }, [step, contactSessionId, sessionValid, setScreen]);

  useEffect(() => {
    if (step !== "settings") {
      return;
    }
    setLoadingMessage("Loading widget settings...");
    if (widgetSettings !== undefined) {
      setWidgetSettings(widgetSettings);
      setStep("done");
    }
  }, [step, widgetSettings, setStep, setWidgetSettings, setLoadingMessage]);

  return (
    <div className="flex flex-col flex-1 gap-y-6 justify-center items-center p-4 text-muted-foreground">
      <div className="loader" />
      <p>{loadingMessage || "Loading..."}</p>
    </div>
  );
};
