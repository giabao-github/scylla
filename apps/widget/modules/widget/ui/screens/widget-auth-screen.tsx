import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import {
  NavigatorWithUAData,
  getPlatform,
  getVendor,
  sanitizeInput,
  validateInput,
} from "@workspace/shared/utils";
import { Button } from "@workspace/ui/components/button";
import { Form, FormField } from "@workspace/ui/components/form";
import { cn } from "@workspace/ui/lib/utils";
import { useMutation } from "convex/react";
import { ArrowBigRightIcon, MailIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { Field } from "@/modules/widget/ui/components/field";
import { WidgetHeader } from "@/modules/widget/ui/components/widget-header";

interface WidgetAuthScreenProps {
  organizationId: string;
}

const formSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .refine((value) => value.length >= 2, {
      message: "Name must be at least 2 characters",
    })
    .refine((value) => value.length <= 50, {
      message: "Name must be at most 50 characters",
    })
    .refine((value) => validateInput("name", value), {
      message:
        "Name contains invalid characters (numbers, special characters, emojis, etc.)",
    }),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Invalid email address")
    .refine((value) => validateInput("email", value), {
      message: "Invalid email address",
    }),
});

type FormSchema = z.infer<typeof formSchema>;

export const WidgetAuthScreen = ({ organizationId }: WidgetAuthScreenProps) => {
  const [done, setDone] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });
  const name = form.watch("name");
  const email = form.watch("email");

  const nameValid = validateInput("name", name);
  const emailValid = validateInput("email", email);

  const createContactSession = useMutation(api.public.contactSessions.create);

  const onSubmit = async (values: FormSchema) => {
    if (!organizationId) {
      toast.error("Organization not found", {
        description: "Please create an organization to continue",
        position: "top-center",
        style: {
          width: "400px",
        },
        action: {
          label: "Dismiss",
          onClick: () => toast.dismiss(),
        },
      });
      return;
    }

    try {
      const ua = navigator.userAgent;

      const nav = navigator as NavigatorWithUAData;

      const platform = getPlatform(nav, ua);
      const vendor = await getVendor(nav, ua);
      const current = new URL(window.location.href);
      let ref: URL | null = null;
      if (document.referrer) {
        try {
          ref = new URL(document.referrer);
        } catch {
          // Malformed referrer, treat as direct
        }
      }

      const metadata: Doc<"contactSessions">["metadata"] = {
        userAgent: ua,
        language: navigator.language,
        languages: navigator.languages ? [...navigator.languages] : undefined,
        platform,
        vendor,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        cookieEnabled: navigator.cookieEnabled,
        referrer: ref ? `${ref.origin}${ref.pathname}` : "direct",
        currentUrl: `${current.origin}${current.pathname}`,
      };

      const contactSessionId = await createContactSession({
        ...values,
        organizationId,
        metadata,
      });

      console.log({ contactSessionId });
      // TODO: handle success state
      setDone(true);
    } catch (error) {
      console.error("Failed to create contact session:", error);
      // TODO: Show error to user via toast or form error
    }
  };

  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col gap-y-2 justify-between px-2 py-6 font-semibold">
          <p className="text-3xl">Hi there! 👋</p>
          <p className="text-lg">Let&apos;s get you started.</p>
        </div>
      </WidgetHeader>
      <Form {...form}>
        <form
          className="flex flex-col flex-1 gap-y-4 items-center p-4 mt-12 md:p-6"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field
                className="w-full md:w-1/2"
                error={fieldState.error?.message}
                icon={UserIcon}
                id="name"
                isValid={fieldState.isDirty && !fieldState.invalid && nameValid}
                label="Name"
                hint="Required"
                placeholder="John Doe"
                type="text"
                value={field.value}
                onChange={(value: string) => {
                  field.onChange(value);
                }}
                onBlur={(value: string) => {
                  const sanitized = sanitizeInput("input", value);
                  field.onChange(sanitized);
                  field.onBlur();
                }}
              />
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <Field
                className="w-full md:w-1/2"
                error={fieldState.error?.message}
                icon={MailIcon}
                id="email"
                isValid={
                  fieldState.isDirty && !fieldState.invalid && emailValid
                }
                label="Email"
                hint="Required"
                placeholder="john.doe@example.com"
                type="email"
                value={field.value}
                onChange={(value: string) => {
                  field.onChange(value);
                }}
                onBlur={(value: string) => {
                  const sanitized = sanitizeInput("input", value);
                  field.onChange(sanitized);
                  field.onBlur();
                }}
              />
            )}
          />
          <Button
            disabled={form.formState.isSubmitting}
            type="submit"
            className={cn(
              "w-full md:w-1/2 h-12 text-base group",
              "bg-[linear-gradient(135deg,#7c3aed_0%,#a855f7_50%,#7c3aed_100%)]",
              "bg-size-[200%_auto]",
              "shadow-[0_4px_24px_rgba(201,169,110,0.25)]",
              "animate-shimmer",
            )}
          >
            {form.formState.isSubmitting ? (
              <div className="spinner"></div>
            ) : (
              <>
                Continue
                <ArrowBigRightIcon
                  className="transition-transform size-4 group-hover:translate-x-1"
                  strokeWidth={2.5}
                />
              </>
            )}
          </Button>
        </form>
      </Form>
    </>
  );
};
