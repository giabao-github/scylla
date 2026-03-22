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

import { useAtom } from "jotai";
import {
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  PaperclipIcon,
  SparklesIcon,
} from "lucide-react";

import { selectedModelAtom } from "@workspace/shared/atoms/atoms";
import {
  ModelId,
  modelCatalog,
} from "@workspace/shared/constants/model-catalog";

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
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
  PromptInputButton,
  PromptInputProvider,
  PromptInputTools,
  usePromptInputAttachments,
} from "@workspace/ui/components/ai/prompt-input";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { cn } from "@workspace/ui/lib/utils";

interface PromptBoxContextValue {
  model: ModelId;
  setModel: (id: ModelId) => void;
  modelSelectorOpen: boolean;
  setModelSelectorOpen: (open: boolean) => void;
  selectedModelData: (typeof modelCatalog)[number] | undefined;
  handleModelSelect: (id: ModelId) => void;
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
    () => modelCatalog.find((m) => m.id === model),
    [model],
  );

  const handleModelSelect = useCallback(
    (id: ModelId) => {
      setModel(id);
      setModelSelectorOpen(false);
    },
    [setModel],
  );

  const value = useMemo(
    () => ({
      model,
      setModel,
      modelSelectorOpen,
      setModelSelectorOpen,
      selectedModelData,
      handleModelSelect,
    }),
    [model, setModel, modelSelectorOpen, selectedModelData, handleModelSelect],
  );

  return (
    <PromptBoxContext.Provider value={value}>
      {children}
    </PromptBoxContext.Provider>
  );
};

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
    <Attachment
      data={attachment}
      onRemove={handleRemove}
      className="rounded-sm"
    >
      <AttachmentPreview className="rounded-sm" />
      <AttachmentRemove />
    </Attachment>
  );
});

AttachmentItem.displayName = "AttachmentItem";

interface ModelItemProps {
  m: (typeof modelCatalog)[number];
  selectedModel: ModelId;
  onSelect: (id: ModelId) => void;
}

const ModelItem = memo(({ m, selectedModel, onSelect }: ModelItemProps) => {
  const handleSelect = useCallback(() => onSelect(m.id), [onSelect, m.id]);
  return (
    <ModelSelectorItem onSelect={handleSelect} value={m.id}>
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
    [attachments.remove],
  );

  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 w-full rounded-sm">
      {attachments.files.map((attachment) => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onRemove={handleRemove}
        />
      ))}
    </div>
  );
};

const uniqueChefs = [...new Set(modelCatalog.map((m) => m.chef))];

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
          {uniqueChefs.map((chef) => (
            <ModelSelectorGroup heading={chef} key={chef}>
              {modelCatalog
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

interface PromptBoxToolsConfig {
  attachments?: boolean;
  search?: boolean;
  enhance?: boolean;
  modelSelector?: boolean;
}

const DEFAULT_TOOLS: PromptBoxToolsConfig = {
  attachments: true,
  search: false,
  enhance: false,
  modelSelector: true,
};

export const PromptBoxActions = ({
  tools = DEFAULT_TOOLS,
}: {
  tools?: PromptBoxToolsConfig;
}) => {
  return (
    <div className="flex flex-row gap-x-1">
      {tools.attachments && (
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
      )}

      {tools.search && (
        <PromptInputButton
          disabled
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
      )}

      {tools.enhance && (
        <PromptInputButton
          disabled // TODO: Implement enhance functionality
          tooltip={{ content: "Enhance message", side: "top" }}
          className={cn(
            "h-7 gap-1.5 px-2 rounded-full text-xs font-medium",
            "text-muted-foreground border border-transparent",
            "hover:bg-muted/60 hover:text-foreground hover:border-border/40",
            "transition-colors",
          )}
        >
          <SparklesIcon className={cn("size-3.5 shrink-0")} />
          <span>Enhance</span>
        </PromptInputButton>
      )}
    </div>
  );
};

export const PromptBoxDefaultTools = ({
  tools = DEFAULT_TOOLS,
}: {
  tools?: PromptBoxToolsConfig;
}) => {
  const showDivider =
    tools.modelSelector && (tools.attachments || tools.search || tools.enhance);

  return (
    <TooltipProvider>
      <PromptInputTools className="gap-0.5">
        <PromptBoxActions tools={tools} />
        {showDivider && (
          <div
            aria-hidden
            className="self-center mx-1 w-px h-4 shrink-0 bg-border/50"
          />
        )}
        {tools.modelSelector && <PromptBoxModelSelector />}
      </PromptInputTools>
    </TooltipProvider>
  );
};

interface PromptBoxProps {
  className?: string;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
  children: ReactNode;
}

export const PromptBox = ({
  onSubmit,
  className,
  children,
}: PromptBoxProps) => {
  return (
    <PromptBoxProvider>
      <div className="size-full">
        <PromptInputProvider>
          <PromptInput
            globalDrop
            multiple
            onSubmit={onSubmit}
            className={cn(
              "rounded-xl border shadow-sm border-border/70 bg-background",
              "focus-within:border-border focus-within:shadow-md",
              "transition-shadow duration-150",
              className,
            )}
          >
            {children}
          </PromptInput>
        </PromptInputProvider>
      </div>
    </PromptBoxProvider>
  );
};
