import { UseFormReturn } from "react-hook-form";

import { hasSubscriptionFeatureAccess } from "@workspace/shared/lib/subscription";
import { type SubscriptionStatus } from "@workspace/shared/types/subscription";
import { Button } from "@workspace/ui/components/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { AlertTriangleIcon } from "lucide-react";

import { useSubscription } from "@/modules/billing/hooks/use-subscription";
import { FormSchema } from "@/modules/customization/types";
import {
  useVapiAssistants,
  useVapiPhoneNumbers,
} from "@/modules/plugins/hooks/use-vapi-data";

interface VapiFormFieldsProps {
  form: UseFormReturn<FormSchema>;
  initialStatus?: SubscriptionStatus;
}

export const VapiFormFields = ({
  form,
  initialStatus,
}: VapiFormFieldsProps) => {
  const { subscription } = useSubscription(initialStatus);
  const hasPremiumAccess = hasSubscriptionFeatureAccess(subscription);

  const {
    data: assistants,
    isLoading: isLoadingAssistants,
    error: assistantsError,
    refetch: refetchAssistants,
  } = useVapiAssistants(hasPremiumAccess);
  const {
    data: phoneNumbers,
    isLoading: isLoadingPhoneNumbers,
    error: phoneNumbersError,
    refetch: refetchPhoneNumbers,
  } = useVapiPhoneNumbers(hasPremiumAccess);

  const disabled = form.formState.isSubmitting;

  if (assistantsError || phoneNumbersError) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-row gap-x-2 items-center">
            <AlertTriangleIcon className="text-rose-400 size-4" />
            <span className="text-sm text-rose-400">
              Failed to load Vapi data. Please try again later.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoadingAssistants || isLoadingPhoneNumbers}
              onClick={() => {
                if (assistantsError) refetchAssistants();
                if (phoneNumbersError) refetchPhoneNumbers();
              }}
              className="ml-2"
            >
              {isLoadingAssistants || isLoadingPhoneNumbers
                ? "Retrying..."
                : "Retry"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <FormField
        control={form.control}
        name="vapiSettings.assistantId"
        render={({ field }) => {
          const assistantValue = isLoadingAssistants
            ? field.value || "none"
            : field.value && assistants?.some((a) => a.id === field.value)
              ? field.value
              : "none";
          return (
            <FormItem>
              <FormLabel className="text-base font-semibold">
                Voice Assistant
              </FormLabel>
              <Select
                disabled={isLoadingAssistants || disabled}
                value={assistantValue}
                onValueChange={(val) =>
                  field.onChange(val === "none" ? "" : val)
                }
              >
                <FormControl>
                  <SelectTrigger className="focus-visible:ring">
                    {isLoadingAssistants ? (
                      <span className="text-muted-foreground">
                        Loading assistants...
                      </span>
                    ) : (
                      <SelectValue placeholder="Select a voice assistant" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" align="start">
                  <SelectItem value="none">None</SelectItem>
                  {assistants?.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id}>
                      {assistant.name || "Unnamed Assistant"} -{" "}
                      {assistant.model?.model || "Unknown model"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The Vapi AI assistant for voice calls
              </FormDescription>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      <FormField
        control={form.control}
        name="vapiSettings.phoneNumber"
        render={({ field }) => {
          const phoneValue = isLoadingPhoneNumbers
            ? field.value || "none"
            : field.value && phoneNumbers?.some((p) => p.number === field.value)
              ? field.value
              : "none";
          return (
            <FormItem>
              <FormLabel className="text-base font-semibold">
                Display Phone Number
              </FormLabel>
              <Select
                disabled={isLoadingPhoneNumbers || disabled}
                value={phoneValue}
                onValueChange={(val) =>
                  field.onChange(val === "none" ? "" : val)
                }
              >
                <FormControl>
                  <SelectTrigger className="focus-visible:ring">
                    {isLoadingPhoneNumbers ? (
                      <span className="text-muted-foreground">
                        Loading phone numbers...
                      </span>
                    ) : (
                      <SelectValue placeholder="Select a phone number" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" align="start">
                  <SelectItem value="none">None</SelectItem>
                  {phoneNumbers
                    ?.filter(
                      (phone): phone is typeof phone & { number: string } =>
                        !!phone.number,
                    )
                    .map((phone) => (
                      <SelectItem key={phone.id} value={phone.number}>
                        {phone.number} - {phone.name || "Unnamed"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The Vapi phone number displaying in the widget
              </FormDescription>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    </>
  );
};
