import { useEffect, useState } from "react";
import Vapi from "@vapi-ai/web";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

const apiKey = process.env.NEXT_PUBLIC_VAPI_API_KEY;
const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID;

export const useVapi = () => {
  const [vapi, setVapi] = useState<Vapi | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!apiKey) {
      console.error("Vapi API key is not configured");
      return;
    }

    const vapiInstance = new Vapi(apiKey);
    setVapi(vapiInstance);

    vapiInstance.on("call-start", () => {
      setIsConnected(true);
      setIsConnecting(false);
      setTranscript([]);
      setHasError(false);
      setError(null);
    });

    vapiInstance.on("call-end", () => {
      setIsConnected(false);
      setIsConnecting(false);
      setIsSpeaking(false);
    });

    vapiInstance.on("speech-start", () => {
      setIsSpeaking(true);
    });

    vapiInstance.on("speech-end", () => {
      setIsSpeaking(false);
    });

    vapiInstance.on("error", (error) => {
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(true);
      setError(error.message || "An error occurred");
    });

    vapiInstance.on("message", (message) => {
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
    });

    return () => {
      vapiInstance?.stop();
    };
  }, []);

  const startCall = () => {
    if (!vapi) {
      console.error("Vapi instance not initialized");
      return;
    }

    setIsConnecting(true);
    setHasError(false);
    setError(null);

    if (!assistantId) {
      console.error("Vapi Assistant ID is not configured");
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(true);
      setError("Vapi Assistant ID is not configured");
      return;
    }

    try {
      vapi.start(assistantId);
    } catch (error: any) {
      setIsConnecting(false);
      setIsConnected(false);
      setHasError(true);
      setError(error.message || "An error occurred");
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
