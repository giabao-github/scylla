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

import { FormSchema } from "@/modules/customization/types";
import {
  useVapiAssistants,
  useVapiPhoneNumbers,
} from "@/modules/plugins/hooks/use-vapi-data";

interface VapiFormFieldsProps {
  form: UseFormReturn<FormSchema>;
}

export const VapiFormFields = ({ form }: VapiFormFieldsProps) => {
  const { data: assistants, isLoading: isLoadingAssistants } =
    useVapiAssistants();
  const { data: phoneNumbers, isLoading: isLoadingPhoneNumbers } =
    useVapiPhoneNumbers();

  const disabled = form.formState.isSubmitting;

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
              value={field.value || undefined}
              onValueChange={field.onChange}
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
              value={field.value || undefined}
              onValueChange={field.onChange}
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
                {phoneNumbers?.map((phone) => (
                  <SelectItem key={phone.id} value={phone.number || phone.id}>
                    {phone.number || "Unknown"} - {phone.name || "Unnamed"}
                  </SelectItem>
                ))}
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
