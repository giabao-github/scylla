import z from "zod";

export const widgetSettingsSchema = z.object({
  greetingMessage: z.string().min(1, "Greeting message is required"),
  defaultSuggestions: z.object({
    firstSuggestion: z.string().optional(),
    secondSuggestion: z.string().optional(),
    thirdSuggestion: z.string().optional(),
  }),
  vapiSettings: z.object({
    assistantId: z.string().optional(),
    phoneNumber: z
      .union([
        z.literal(""),
        z.literal("none"),
        z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
      ])
      .optional(),
  }),
});

export type FormSchema = z.infer<typeof widgetSettingsSchema>;
