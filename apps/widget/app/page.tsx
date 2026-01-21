"use client";

import { Button } from "@workspace/ui/components/button";
import { useVapi } from "@/modules/widget/hooks/use-vapi";

export default function Page() {
  const {
    startCall,
    endCall,
    isConnected,
    isConnecting,
    isSpeaking,
    transcript,
  } = useVapi();

  return (
    <div className="flex flex-col gap-y-4 items-center justify-center min-h-svh max-w-md mx-auto w-full">
      <p>Scylla widget</p>
      <Button onClick={() => startCall()}>Start call</Button>
      <Button onClick={() => endCall()} variant="destructive">
        End call
      </Button>
      <p>isConnected: {isConnected.toString()}</p>
      <p>isConnecting: {isConnecting.toString()}</p>
      <p>isSpeaking: {isSpeaking.toString()}</p>
      <p>transcript: {transcript.map((t) => t.content).join(" ")}</p>
    </div>
  );
}
