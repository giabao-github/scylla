import { useEffect, useState } from "react";

import Vapi from "@vapi-ai/web";
import {
  vapiSecretsAtom,
  widgetSettingsAtom,
} from "@workspace/shared/atoms/atoms";
import { useAtomValue } from "jotai";
import { toast } from "sonner";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export const useVapi = () => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  const vapiSecrets = useAtomValue(vapiSecretsAtom);
  const widgetSettings = useAtomValue(widgetSettingsAtom);

  useEffect(() => {
    if (!vapiSecrets?.publicApiKey) {
      setVapi(null);
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
      setTranscript([]);
      return;
    }

    const vapiInstance = new Vapi(vapiSecrets.publicApiKey);
    setVapi(vapiInstance);

    const handleCallStart = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setTranscript([]);
      setHasError(false);
      setError(null);
    };

    const handleCallEnd = () => {
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
    };

    const handleSpeechStart = () => {
      setIsSpeaking(true);
    };

    const handleSpeechEnd = () => {
      setIsSpeaking(false);
    };

    const handleError = (error: any) => {
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(true);
      setError(error.message || "An error occurred");
    };

    const handleMessage = (message: any) => {
      if (message.type === "assistant.started") {
        setIsConnected(true);
        setIsConnecting(false);
        setHasError(false);
        setError(null);
        setTranscript([]);
      }

      if (message.type === "status-update" && message.status === "ended") {
        setIsConnected(false);
        setIsConnecting(false);
        setIsSpeaking(false);
      }

      if (message.type === "transcript" && message.transcriptType === "final") {
        setTranscript((prev) => [
          ...prev,
          {
            role: message.role === "user" ? "user" : "assistant",
            content: message.transcript,
          },
        ]);
      }
    };

    vapiInstance.on("call-start", handleCallStart);
    vapiInstance.on("call-end", handleCallEnd);
    vapiInstance.on("speech-start", handleSpeechStart);
    vapiInstance.on("speech-end", handleSpeechEnd);
    vapiInstance.on("error", handleError);
    vapiInstance.on("message", handleMessage);

    return () => {
      vapiInstance.off("call-start", handleCallStart);
      vapiInstance.off("call-end", handleCallEnd);
      vapiInstance.off("speech-start", handleSpeechStart);
      vapiInstance.off("speech-end", handleSpeechEnd);
      vapiInstance.off("error", handleError);
      vapiInstance.off("message", handleMessage);
      vapiInstance.stop();
    };
  }, [vapiSecrets?.publicApiKey]);

  const startCall = async () => {
    if (!vapi) {
      setHasError(true);
      setError("Voice is not configured");
      toast.error("Voice is not configured");
      return;
    }

    setIsConnecting(true);
    setHasError(false);
    setError(null);

    const assistantId = widgetSettings?.vapiSettings?.assistantId;

    if (!assistantId) {
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(true);
      setError("Vapi Assistant ID is not configured");
      toast.error("Vapi Assistant ID is not configured");
      return;
    }

    try {
      await vapi.start(assistantId);
    } catch (error) {
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(true);
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const endCall = () => {
    if (vapi) {
      vapi.stop();
    }
  };

  return {
    startCall,
    endCall,
    isConnected,
    isConnecting,
    isSpeaking,
    transcript,
    error,
    hasError,
  };
};
