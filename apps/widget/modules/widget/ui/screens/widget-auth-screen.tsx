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
    .refine((value) => validateInput("name", value).valid, {
      message: "Invalid name",
    }),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .refine((value) => validateInput("email", value).valid, {
      message: "Invalid email address",
    }),
});

type FormSchema = z.infer<typeof formSchema>;

export const WidgetAuthScreen = ({ organizationId }: WidgetAuthScreenProps) => {
  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });
  const name = form.watch("name");
  const email = form.watch("email");

  const { valid: nameValid, message: nameInvalidMessage } = validateInput(
    "name",
    name,
  );
  const { valid: emailValid, message: emailInvalidMessage } = validateInput(
    "email",
    email,
  );

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
            render={({ field, fieldState }) => {
              const touched = fieldState.isDirty || fieldState.isTouched;
              return (
                <Field
                  className="w-full md:w-1/2"
                  error={
                    touched
                      ? nameInvalidMessage || fieldState.error?.message
                      : fieldState.error?.message
                  }
                  icon={UserIcon}
                  id="name"
                  isValid={
                    fieldState.isDirty && !fieldState.invalid && nameValid
                  }
                  label="Name"
                  tooltips={[
                    "At least 2 characters",
                    "Maximum 50 characters",
                    "Letters (a-z, A-Z), spaces, hyphens (-), and apostrophes (') only",
                    "Cannot start or end with a space or hyphen (-)",
                    "No consecutive spaces or hyphens (-)",
                    "No numbers (0-9), special characters (!@#$%^&*()_+), or emojis 😊",
                  ]}
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
              );
            }}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field, fieldState }) => {
              const touched = fieldState.isDirty || fieldState.isTouched;
              return (
                <Field
                  className="w-full md:w-1/2"
                  error={
                    touched
                      ? emailInvalidMessage || fieldState.error?.message
                      : fieldState.error?.message
                  }
                  icon={MailIcon}
                  id="email"
                  isValid={
                    fieldState.isDirty && !fieldState.invalid && emailValid
                  }
                  label="Email"
                  hint="Required"
                  tooltips={[
                    "Format: <local>@<domain>.<tld>",
                    "Must contain exactly one @ symbol",
                    "Local part (before @) max 64 characters",
                    "Local part cannot start or end with special characters (!@#$%^&*()_+)",
                    "Domain labels can only contain letters (a-z, A-Z), numbers (0-9), and hyphens (-)",
                    "Domain labels cannot start or end with a hyphen (-)",
                    "Top-level domain (TLD) must be letters (a-z, A-Z) only, at least 2 characters (e.g. .com, .io)",
                    "Max 254 characters total",
                    "No consecutive dots (.)",
                    "No spaces or emojis 😊",
                  ]}
                  placeholder="john.doe@example.com"
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
              );
            }}
          />
          <Button
            disabled={form.formState.isSubmitting}
            type="submit"
            className={cn(
              "w-full h-12 text-base md:w-1/2 group",
              "relative bg-transparent border-none hover:bg-transparent focus:bg-transparent",
              "mt-2 mb-2",
            )}
          >
            {/* Back panel — offset down-right, shifts more on hover */}
            <span
              className="absolute inset-0 rounded-[1.25em] transition-all duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] "
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                boxShadow: "0 8px 32px rgba(124, 58, 237, 0.5)",
              }}
            />

            {/* Front glass panel — frosted, sits perfectly in original position */}
            <span
              className="absolute inset-0 rounded-[1.25em] backdrop-blur-md bg-white/10 flex items-center justify-center gap-2 text-white font-semibold tracking-wide transition-all duration-300 group-hover:bg-white/20"
              style={{
                boxShadow:
                  "0 0 0 1.5px hsla(0, 0%, 100%, 0.35) inset, 0 8px 32px rgba(0,0,0,0.2)",
              }}
            >
              {form.formState.isSubmitting ? (
                <div className="spinner" />
              ) : (
                <>
                  Continue
                  <ArrowBigRightIcon
                    className="transition-transform size-4 group-hover:translate-x-1"
                    strokeWidth={2.5}
                  />
                </>
              )}
            </span>
          </Button>
        </form>
      </Form>
    </>
  );
};
