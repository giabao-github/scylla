"use client";

import {
  FormEvent,
  ReactNode,
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@workspace/ui/components/ai/attachments";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@workspace/ui/components/ai/model-selector";
import type { PromptInputMessage } from "@workspace/ui/components/ai/prompt-input";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "@workspace/ui/components/ai/prompt-input";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { useAtom } from "jotai";
import {
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  PaperclipIcon,
} from "lucide-react";

import { selectedModelAtom } from "@/modules/widget/atoms/widget-atoms";

const models = [
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3-flash-preview",
    name: "Gemini 3.0 Flash Preview",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3-pro-preview",
    name: "Gemini 3.0 Pro Preview",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3.1-flash-lite-preview",
    name: "Gemini 3.1 Flash Lite Preview",
    providers: ["google"],
  },
  {
    chef: "Google",
    chefSlug: "google",
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    providers: ["google"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4o",
    name: "GPT-4o",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-4.1",
    name: "GPT-4.1",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5",
    name: "GPT-5",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5.1",
    name: "GPT-5.1",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5.2",
    name: "GPT-5.2",
    providers: ["openai", "azure"],
  },
  {
    chef: "OpenAI",
    chefSlug: "openai",
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    providers: ["openai", "azure"],
  },
];

interface PromptBoxContextValue {
  model: string;
  setModel: (id: string) => void;
  modelSelectorOpen: boolean;
  setModelSelectorOpen: (open: boolean) => void;
  selectedModelData: (typeof models)[number] | undefined;
  handleModelSelect: (id: string) => void;
}

const PromptBoxContext = createContext<PromptBoxContextValue | null>(null);

export const usePromptBox = () => {
  const context = useContext(PromptBoxContext);
  if (!context) {
    throw new Error("usePromptBox must be used within a PromptBoxProvider");
  }
  return context;
};

export const PromptBoxProvider = ({ children }: { children: ReactNode }) => {
  const [model, setModel] = useAtom(selectedModelAtom);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

  const selectedModelData = useMemo(
    () => models.find((m) => m.id === model),
    [model],
  );

  const handleModelSelect = useCallback((id: string) => {
    setModel(id);
    setModelSelectorOpen(false);
  }, []);

  const value = useMemo(
    () => ({
      model,
      setModel,
      modelSelectorOpen,
      setModelSelectorOpen,
      selectedModelData,
      handleModelSelect,
    }),
    [model, modelSelectorOpen, selectedModelData, handleModelSelect],
  );

  return (
    <PromptBoxContext.Provider value={value}>
      {children}
    </PromptBoxContext.Provider>
  );
};

const SUBMITTING_TIMEOUT = 200;
const STREAMING_TIMEOUT = 2000;

interface AttachmentItemProps {
  attachment: {
    id: string;
    type: "file";
    filename?: string;
    mediaType: string;
    url: string;
  };
  onRemove: (id: string) => void;
}

const AttachmentItem = memo(({ attachment, onRemove }: AttachmentItemProps) => {
  const handleRemove = useCallback(
    () => onRemove(attachment.id),
    [onRemove, attachment.id],
  );
  return (
    <Attachment data={attachment} key={attachment.id} onRemove={handleRemove}>
      <AttachmentPreview />
      <AttachmentRemove />
    </Attachment>
  );
});

AttachmentItem.displayName = "AttachmentItem";

interface ModelItemProps {
  m: (typeof models)[number];
  selectedModel: string;
  onSelect: (id: string) => void;
}

const ModelItem = memo(({ m, selectedModel, onSelect }: ModelItemProps) => {
  const handleSelect = useCallback(() => onSelect(m.id), [onSelect, m.id]);
  return (
    <ModelSelectorItem key={m.id} onSelect={handleSelect} value={m.id}>
      <ModelSelectorLogo provider={m.chefSlug} />
      <ModelSelectorName>{m.name}</ModelSelectorName>
      <ModelSelectorLogoGroup>
        {m.providers.map((provider) => (
          <ModelSelectorLogo key={provider} provider={provider} />
        ))}
      </ModelSelectorLogoGroup>
      {selectedModel === m.id ? (
        <CheckIcon className="ml-auto size-4" strokeWidth={3} />
      ) : (
        <div className="ml-auto size-4" />
      )}
    </ModelSelectorItem>
  );
});

ModelItem.displayName = "ModelItem";

export const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();

  const handleRemove = useCallback(
    (id: string) => attachments.remove(id),
    [attachments],
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <div className="px-3 pt-3 pb-1">
      <Attachments variant="inline">
        {attachments.files.map((attachment) => (
          <AttachmentItem
            attachment={attachment}
            key={attachment.id}
            onRemove={handleRemove}
          />
        ))}
      </Attachments>
    </div>
  );
};

export const PromptBoxModelSelector = () => {
  const {
    model,
    modelSelectorOpen,
    setModelSelectorOpen,
    selectedModelData,
    handleModelSelect,
  } = usePromptBox();

  return (
    <ModelSelector onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
      <ModelSelectorTrigger asChild>
        <PromptInputButton
          tooltip={{ content: "Select model", side: "top" }}
          className={cn(
            "max-w-64 gap-1.5 px-2 h-7 rounded-full text-xs font-medium",
            "border border-border/60 bg-muted/40 text-muted-foreground",
            "hover:bg-muted hover:text-foreground hover:border-border",
            "transition-colors",
          )}
        >
          {selectedModelData?.chefSlug && (
            <ModelSelectorLogo
              provider={selectedModelData.chefSlug}
              className="size-3 shrink-0"
            />
          )}
          {selectedModelData?.name && (
            <ModelSelectorName className="text-xs truncate">
              {selectedModelData.name}
            </ModelSelectorName>
          )}
          <ChevronDownIcon className="opacity-50 size-3 shrink-0" />
        </PromptInputButton>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {["Google", "OpenAI"].map((chef) => (
            <ModelSelectorGroup heading={chef} key={chef}>
              {models
                .filter((m) => m.chef === chef)
                .map((m) => (
                  <ModelItem
                    key={m.id}
                    m={m}
                    onSelect={handleModelSelect}
                    selectedModel={model}
                  />
                ))}
            </ModelSelectorGroup>
          ))}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};

export const PromptBoxActions = () => {
  return (
    <div className="flex flex-row gap-x-1">
      <PromptInputActionMenu>
        <PromptInputActionMenuTrigger
          tooltip={{ content: "Attach files", side: "top" }}
          className="w-7 h-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <PaperclipIcon className="size-3.5" />
        </PromptInputActionMenuTrigger>
        <PromptInputActionMenuContent>
          <PromptInputActionAddAttachments />
        </PromptInputActionMenuContent>
      </PromptInputActionMenu>

      <PromptInputButton
        tooltip={{ content: "Search the web", side: "top" }}
        className={cn(
          "h-7 gap-1.5 px-2 rounded-full text-xs font-medium",
          "text-muted-foreground border border-transparent",
          "hover:bg-muted/60 hover:text-foreground hover:border-border/40",
          "transition-colors",
        )}
      >
        <GlobeIcon className="size-3.5 shrink-0" />
        <span>Search</span>
      </PromptInputButton>
    </div>
  );
};

export const PromptBoxDefaultTools = () => {
  return (
    <TooltipProvider>
      <PromptInputTools className="gap-0.5">
        <PromptBoxActions />
        <div aria-hidden className="self-center mx-1 w-px h-4 shrink-0" />
        <PromptBoxModelSelector />
      </PromptInputTools>
    </TooltipProvider>
  );
};

interface PromptBoxProps {
  disabled?: boolean;
  type?: "submit" | "button";
  className?: string;
  onSubmit?: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  children?: ReactNode;
}

export const PromptBox = ({
  disabled,
  type,
  onSubmit,
  className,
  children,
}: PromptBoxProps) => {
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");

  const handleSubmit = useCallback((message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    setStatus("submitted");
    // eslint-disable-next-line no-console
    console.log("Submitting message:", message);

    setTimeout(() => setStatus("streaming"), SUBMITTING_TIMEOUT);
    setTimeout(() => setStatus("ready"), STREAMING_TIMEOUT);
  }, []);

  return (
    <PromptBoxProvider>
      <div className="size-full">
        <PromptInputProvider>
          <PromptInput
            globalDrop
            multiple
            onSubmit={onSubmit || handleSubmit}
            className={cn(
              "rounded-xl border shadow-sm border-border/70 bg-background",
              "focus-within:border-border focus-within:shadow-md",
              "transition-shadow duration-150",
              className,
            )}
          >
            {children || (
              <>
                <PromptInputAttachmentsDisplay />

                <PromptInputBody>
                  <PromptInputTextarea
                    className={cn(
                      "px-4 pt-4 pb-2 max-h-52 min-h-[116px]",
                      "resize-none placeholder:text-muted-foreground/50",
                    )}
                  />
                </PromptInputBody>

                <PromptInputFooter
                  className={cn(
                    "px-2 py-1.5 cursor-default",
                    "border-t border-border/50",
                  )}
                >
                  <PromptBoxDefaultTools />

                  <PromptInputSubmit
                    disabled={disabled}
                    status={status}
                    type={type}
                    className={cn(
                      "w-7 h-7 rounded-full shrink-0",
                      "bg-primary text-primary-foreground",
                      "hover:bg-primary/90 active:scale-95",
                      "disabled:opacity-40 disabled:cursor-not-allowed",
                      "transition-all duration-150",
                    )}
                  />
                </PromptInputFooter>
              </>
            )}
          </PromptInput>
        </PromptInputProvider>
      </div>
    </PromptBoxProvider>
  );
};
