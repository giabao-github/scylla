import { UseFormReturn } from "react-hook-form";

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

import { FormSchema } from "@/modules/customization/types";
import {
  useVapiAssistants,
  useVapiPhoneNumbers,
} from "@/modules/plugins/hooks/use-vapi-data";

interface VapiFormFieldsProps {
  form: UseFormReturn<FormSchema>;
}

export const VapiFormFields = ({ form }: VapiFormFieldsProps) => {
  const {
    data: assistants,
    isLoading: isLoadingAssistants,
    error: assistantsError,
  } = useVapiAssistants();
  const {
    data: phoneNumbers,
    isLoading: isLoadingPhoneNumbers,
    error: phoneNumbersError,
  } = useVapiPhoneNumbers();

  const disabled = form.formState.isSubmitting;

  if (assistantsError || phoneNumbersError) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-rose-400">
            Vapi Data Fetching Error
          </h3>
          <div className="flex flex-row gap-x-2 items-center">
            <AlertTriangleIcon className="text-rose-400 size-4" />
            <span className="text-sm text-rose-400">
              Failed to load Vapi data. Please try again later.
            </span>
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
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-semibold">
              Voice Assistant
            </FormLabel>
            <Select
              disabled={isLoadingAssistants || disabled}
              value={field.value || "none"}
              onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
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
        )}
      />
      <FormField
        control={form.control}
        name="vapiSettings.phoneNumber"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base font-semibold">
              Display Phone Number
            </FormLabel>
            <Select
              disabled={isLoadingPhoneNumbers || disabled}
              value={field.value || "none"}
              onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
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
                {phoneNumbers?.map((phone) =>
                  phone.number ? (
                    <SelectItem key={phone.id} value={phone.number}>
                      {phone.number} - {phone.name || "Unnamed"}
                    </SelectItem>
                  ) : null,
                )}
              </SelectContent>
            </Select>
            <FormDescription>
              The Vapi phone number displaying in the widget
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};
