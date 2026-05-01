import { type KeyboardEvent, useEffect } from "react";
import { type Path, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { BotMessageSquareIcon, Loader2Icon, MicIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import {
  FormSchema,
  widgetSettingsSchema,
} from "@/modules/customization/types";
import { VapiFormFields } from "@/modules/customization/ui/components/vapi-form-fields";
import { api } from "@workspace/backend/_generated/api";
import { Doc } from "@workspace/backend/_generated/dataModel";
import { hasSubscriptionFeatureAccess } from "@workspace/shared/lib/subscription";
import type { InitialSubscriptionStatus } from "@workspace/shared/types/subscription";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";

type WidgetSettings = Doc<"widgetSettings">;

interface CustomizationFormProps {
  initialData?: WidgetSettings | null;
  hasVapiPlugin: boolean;
  initialStatus?: InitialSubscriptionStatus;
}

const normalizeFormValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeFormValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        normalizeFormValue(nestedValue),
      ]),
    );
  }

  return value;
};

const UpgradePrompt = ({ message }: { message: string }) => {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/billing");
  }, [router]);

  return (
    <CardContent>
      <div className="flex flex-col gap-y-4 justify-center items-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button type="button" onClick={() => router.push("/billing")}>
          Upgrade Plan
        </Button>
      </div>
    </CardContent>
  );
};

export const CustomizationForm = ({
  initialData,
  hasVapiPlugin,
  initialStatus,
}: CustomizationFormProps) => {
  const upsertWidgetSettings = useMutation(api.private.widgetSettings.upsert);
  const { isLoading, subscription } = useSubscription(initialStatus);
  const hasPremiumAccess = isLoading
    ? initialStatus === "active"
    : hasSubscriptionFeatureAccess(subscription);

  const form = useForm<FormSchema>({
    resolver: zodResolver(widgetSettingsSchema),
    defaultValues: {
      greetingMessage:
        initialData?.greetingMessage ?? "Hello, how can I help you today?",
      defaultSuggestions: {
        firstSuggestion: initialData?.defaultSuggestions?.firstSuggestion ?? "",
        secondSuggestion:
          initialData?.defaultSuggestions?.secondSuggestion ?? "",
        thirdSuggestion: initialData?.defaultSuggestions?.thirdSuggestion ?? "",
      },
      vapiSettings: {
        assistantId: initialData?.vapiSettings?.assistantId ?? "",
        phoneNumber: initialData?.vapiSettings?.phoneNumber ?? "",
      },
    },
  });

  const currentValues = form.watch();
  const hasMeaningfulChanges =
    JSON.stringify(normalizeFormValue(currentValues)) !==
    JSON.stringify(normalizeFormValue(form.formState.defaultValues));
  const isSaveDisabled = form.formState.isSubmitting || !hasMeaningfulChanges;

  const handleFillPlaceholder = (
    event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (event.key !== "ArrowRight") {
      return;
    }

    const { value, placeholder } = event.currentTarget;
    if (value || !placeholder) {
      return;
    }

    const fieldName = event.currentTarget.name;
    if (!fieldName) {
      return;
    }

    event.preventDefault();
    form.setValue(fieldName as Path<FormSchema>, placeholder, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const onSubmit = async (values: FormSchema) => {
    try {
      await upsertWidgetSettings({
        greetingMessage: values.greetingMessage,
        defaultSuggestions: values.defaultSuggestions,
        vapiSettings: values.vapiSettings,
      });
      form.reset({
        greetingMessage: values.greetingMessage,
        defaultSuggestions: values.defaultSuggestions,
        vapiSettings: values.vapiSettings,
      });
      toast.success("Widget settings saved successfully");
    } catch (error) {
      console.error("Error saving widget settings:", error);
      toast.error("Failed to save widget settings");
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader className="mb-4">
            <CardTitle className="flex flex-row gap-x-2 items-center text-lg">
              <BotMessageSquareIcon className="size-5" />
              General Chat Settings
            </CardTitle>
            <CardDescription className="text-sm">
              Configure basic chat widget behavior and messages
            </CardDescription>
          </CardHeader>
          {hasPremiumAccess ? (
            <CardContent>
              <FormField
                control={form.control}
                name="greetingMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">
                      Greeting Message
                    </FormLabel>
                    <FormDescription className="text-sm text-muted-foreground">
                      The first message shown to customers when they open the
                      chat.
                    </FormDescription>
                    <FormControl>
                      <Textarea
                        {...field}
                        onKeyDown={handleFillPlaceholder}
                        rows={3}
                        placeholder="Welcome message shown when conversation starts"
                        className="mt-2 max-h-28 scrollbar-themed placeholder:text-muted-foreground/50 focus-visible:ring"
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
              <Separator className="my-6" />
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-base font-semibold">
                    Default Suggestions
                  </h3>
                  <p className="mb-6 text-sm text-muted-foreground">
                    Messages shown to customers as quick replies to help them
                    guide the conversation.
                  </p>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="defaultSuggestions.firstSuggestion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            First Suggestion
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onKeyDown={handleFillPlaceholder}
                              placeholder="How do I get started?"
                              className="placeholder:text-muted-foreground/50 focus-visible:ring"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultSuggestions.secondSuggestion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Second Suggestion
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onKeyDown={handleFillPlaceholder}
                              placeholder="What pricing plans does your platform feature?"
                              className="placeholder:text-muted-foreground/50 focus-visible:ring"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="defaultSuggestions.thirdSuggestion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold">
                            Third Suggestion
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onKeyDown={handleFillPlaceholder}
                              placeholder="How do I enable two-factor authentication?"
                              className="placeholder:text-muted-foreground/50 focus-visible:ring"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          ) : (
            <UpgradePrompt message="Subscribe to a plan to access chat widget customization features" />
          )}
        </Card>

        {hasVapiPlugin && (
          <Card>
            <CardHeader className="mb-4">
              <CardTitle className="flex flex-row gap-x-2 items-center text-lg">
                <MicIcon className="size-5" />
                AI Voice Settings
              </CardTitle>
              <CardDescription className="text-sm">
                Configure AI voice calling features powered by Vapi
              </CardDescription>
            </CardHeader>
            {hasPremiumAccess ? (
              <CardContent className="space-y-6">
                <VapiFormFields form={form} initialStatus={initialStatus} />
              </CardContent>
            ) : (
              <UpgradePrompt message="Subscribe to a plan to access AI voice calling features" />
            )}
          </Card>
        )}

        <div className="flex justify-end">
          <Button disabled={isSaveDisabled} type="submit">
            {form.formState.isSubmitting ? (
              <>
                <Loader2Icon
                  className="animate-spin size-4"
                  aria-hidden="true"
                />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
