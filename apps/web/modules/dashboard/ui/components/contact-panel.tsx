"use client";

import React, { useMemo } from "react";

import Bowser from "bowser";
import { useQuery } from "convex/react";
import { ClockIcon, GlobeIcon, MailIcon, MonitorIcon } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";

import { getBrowserIcon, getOsIcon } from "@/modules/dashboard/icons";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import {
  getCountryFlagUrl,
  getCountryFromTimezone,
} from "@workspace/shared/lib/metadata";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Button } from "@workspace/ui/components/button";
import { DicebearAvatar } from "@workspace/ui/components/dicebear-avatar";

type InfoItem = {
  label: string;
  value: string | React.ReactNode;
  className?: string;
};

type InfoSection = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  items: InfoItem[];
};

const parseUserAgent = (userAgent?: string) => {
  if (!userAgent) {
    return {
      browser: "Unknown",
      browserVersion: "",
      os: "Unknown",
      osVersion: "",
      device: "Unknown",
      deviceVendor: "",
      deviceModel: "",
    };
  }

  const result = Bowser.getParser(userAgent).getResult();

  return {
    browser: result.browser.name ?? "Unknown",
    browserVersion: result.browser.version ?? "",
    os: result.os.name ?? "Unknown",
    osVersion: result.os.version ?? "",
    device: result.platform.type ?? "desktop",
    deviceVendor: result.platform.vendor ?? "",
    deviceModel: result.platform.model ?? "",
  };
};

const getLanguageName = (locale?: string) => {
  if (!locale) return "—";

  try {
    const [lang = locale] = locale.split("-");

    const display = new Intl.DisplayNames(["en"], {
      type: "language",
    });

    return display.of(lang) ?? locale;
  } catch {
    return locale;
  }
};

const formatOffset = (minutes?: number) => {
  if (minutes == null) return "—";

  const hours = -minutes / 60;
  const sign = hours >= 0 ? "+" : "-";
  const absHours = Math.abs(hours);
  const wholeHours = Math.floor(absHours);
  const remainingMinutes = Math.round((absHours - wholeHours) * 60);

  return remainingMinutes > 0
    ? `UTC${sign}${wholeHours}:${remainingMinutes.toString().padStart(2, "0")}`
    : `UTC${sign}${wholeHours}`;
};

const IconLabel = ({
  name,
  icon: Icon,
}: {
  name: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <span className="flex gap-x-2 items-center">
    {Icon && <Icon className="size-3.5 shrink-0 text-foreground" />}
    {name}
  </span>
);

export const ContactPanel = () => {
  const params = useParams();
  const rawConversationId = params.conversationId;
  const conversationId =
    typeof rawConversationId === "string"
      ? (rawConversationId as Id<"conversations">)
      : null;

  const contactSession = useQuery(
    api.private.contactSessions.getOneByConversationId,
    conversationId ? { conversationId } : "skip",
  );

  const userAgentInfo = useMemo(
    () => parseUserAgent(contactSession?.metadata?.userAgent),
    [contactSession?.metadata?.userAgent],
  );

  const metadata = contactSession?.metadata;

  const country = useMemo(
    () =>
      metadata?.countryCode
        ? { code: metadata.countryCode, name: metadata.country ?? "" }
        : getCountryFromTimezone(metadata?.timezone ?? undefined),
    [metadata?.countryCode, metadata?.country, metadata?.timezone],
  );

  const countryFlagUrl = country?.code
    ? (getCountryFlagUrl(country.code) ?? undefined)
    : undefined;

  const accordionSections = useMemo<InfoSection[]>(() => {
    if (!metadata || !contactSession) return [];

    const BrowserIcon = getBrowserIcon(userAgentInfo.browser);
    const OsIcon = getOsIcon(userAgentInfo.os);

    const deviceParts = [
      userAgentInfo.device,
      userAgentInfo.deviceVendor,
      userAgentInfo.deviceModel,
    ]
      .filter(Boolean)
      .join(" – ");

    return [
      {
        id: "device-info",
        icon: MonitorIcon,
        title: "Device Information",
        items: [
          {
            label: "Browser",
            value: (
              <IconLabel name={userAgentInfo.browser} icon={BrowserIcon} />
            ),
          },
          {
            label: "Browser Version",
            value: userAgentInfo.browserVersion || "—",
          },
          {
            label: "OS",
            value: <IconLabel name={userAgentInfo.os} icon={OsIcon} />,
          },
          {
            label: "OS Version",
            value: userAgentInfo.osVersion || "—",
          },
          {
            label: "Device",
            value: deviceParts || "—",
            className: "capitalize",
          },
          {
            label: "Screen",
            value: metadata.screenResolution
              ? metadata.screenResolution.split("x").join(" × ")
              : "—",
          },
          {
            label: "Viewport",
            value: metadata.viewportSize
              ? metadata.viewportSize.split("x").join(" × ")
              : "—",
          },
          {
            label: "Cookies",
            value:
              metadata.cookieEnabled === true
                ? "Enabled"
                : metadata.cookieEnabled === false
                  ? "Disabled"
                  : "—",
          },
        ],
      },
      {
        id: "location-info",
        icon: GlobeIcon,
        title: "Location and Language",
        items: [
          ...(country?.name && countryFlagUrl
            ? [
                {
                  label: "Country",
                  value: (
                    <span className="flex gap-x-2 items-center">
                      <Image
                        src={countryFlagUrl}
                        alt={country.name}
                        width={20}
                        height={20}
                      />
                      {country.name}
                    </span>
                  ),
                },
              ]
            : []),
          {
            label: "Language",
            value: getLanguageName(metadata.language),
          },
          {
            label: "Timezone",
            value: metadata.timezone ?? "—",
          },
          {
            label: "UTC Offset",
            value: formatOffset(metadata.timezoneOffset),
          },
        ],
      },
      {
        id: "session-details",
        icon: ClockIcon,
        title: "Session Details",
        items: [
          {
            label: "Session Started",
            value: new Date(contactSession._creationTime).toLocaleString(
              undefined,
              {
                dateStyle: "medium",
                timeStyle: "short",
              },
            ),
          },
          {
            label: "Session Expires",
            value: contactSession.expiresAt
              ? new Date(contactSession.expiresAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : "—",
          },
        ],
      },
    ];
  }, [metadata, userAgentInfo, contactSession, country, countryFlagUrl]);

  if (contactSession === undefined) {
    return (
      <div className="flex flex-col flex-1 gap-y-4 justify-center items-center h-full min-h-0">
        <div className="loader [--loader-size:30px]" />
        <p className="text-sm text-muted-foreground">
          Loading contact session...
        </p>
      </div>
    );
  }

  if (contactSession === null) {
    return (
      <div className="flex flex-col flex-1 gap-y-4 justify-center items-center h-full min-h-0">
        <p className="text-sm text-muted-foreground">
          No contact session found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full bg-background text-foreground">
      <div className="flex flex-col gap-y-6 p-4">
        <div className="flex gap-x-2 items-center">
          <DicebearAvatar
            badgeImageUrl={countryFlagUrl}
            seed={contactSession._id}
            size={42}
          />
          <div className="overflow-hidden flex-1">
            <h4 className="text-sm font-medium truncate">
              {contactSession.name}
            </h4>
            <p className="text-sm truncate text-muted-foreground">
              {contactSession.email}
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="mx-6">
          <a href={`mailto:${contactSession.email}`}>
            <MailIcon />
            <span className="select-none">Send email</span>
          </a>
        </Button>
      </div>

      {metadata && (
        <Accordion
          collapsible
          type="single"
          className="w-full rounded-none border-y"
        >
          {accordionSections.map((section) => (
            <AccordionItem
              key={section.id}
              value={section.id}
              className="rounded-none outline-none has-focus-visible:z-10 has-focus-visible:border-ring has-focus-visible:ring has-focus-visible:ring-ring/50"
            >
              <AccordionTrigger className="flex flex-1 gap-4 justify-between items-start px-5 py-4 w-full text-sm font-medium text-left rounded-none transition-all outline-none bg-accent hover:no-underline disabled:pointer-events-none disabled:opacity-50">
                <div className="flex gap-4 items-center">
                  <section.icon className="mr-2 w-4 h-4" />
                  <span>{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 py-4">
                <div className="flex flex-col gap-y-2 text-sm">
                  {section.items.map((item) => (
                    <div
                      key={`${section.id}-${item.label}`}
                      className="flex justify-between"
                    >
                      <span className="font-medium text-muted-foreground">
                        {item.label}:
                      </span>
                      <span className={item.className}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
};
