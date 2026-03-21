import { useMemo } from "react";

import { glass } from "@dicebear/collection";
import { createAvatar } from "@dicebear/core";

import { Avatar, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

interface DicebearAvatarProps {
  seed: string;
  size?: number;
  className?: string;
  badgeClassName?: string;
  imageUrl?: string;
  badgeImageUrl?: string;
}

interface AgentAvatarProps {
  seed?: string;
  size?: number;
  isThinking?: boolean;
  className?: string;
}
export const DicebearAvatar = ({
  seed,
  size = 32,
  className,
  badgeClassName,
  imageUrl,
  badgeImageUrl,
}: DicebearAvatarProps) => {
  const avatarSrc = useMemo(() => {
    if (imageUrl) {
      return imageUrl;
    }

    const avatar = createAvatar(glass, {
      seed: seed.toLowerCase().trim(),
      size,
    });

    return avatar.toDataUri();
  }, [seed, size, imageUrl]);

  const badgeSize = Math.round(size * 0.5);

  return (
    <div
      className={cn("inline-block relative", className)}
      style={{ width: size, height: size }}
    >
      <Avatar className="border" style={{ width: size, height: size }}>
        <AvatarImage alt="Avatar" src={avatarSrc} />
      </Avatar>
      {badgeImageUrl && (
        <div
          className={cn(
            "flex overflow-hidden absolute right-0 bottom-0 justify-center items-center rounded-full border-2 border-background bg-background",
            badgeClassName,
          )}
          style={{
            width: badgeSize,
            height: badgeSize,
            transform: "translate(15%, 15%)",
          }}
        >
          <img
            alt="Badge"
            height={badgeSize}
            width={badgeSize}
            src={badgeImageUrl}
            className="object-cover w-full h-full"
          />
        </div>
      )}
    </div>
  );
};

export const AgentAvatar = ({
  seed = "assistant",
  isThinking = false,
  size = 32,
  className,
}: AgentAvatarProps) => (
  <div
    className={cn(
      "shrink-0 flex items-center justify-center",
      "rounded-full mt-0.5",
      "border-2 transition-colors",
      "bg-primary/10 border-primary/20",
      isThinking && "animate-pulse",
      className,
    )}
    style={{ width: size, height: size }}
  >
    <DicebearAvatar seed={seed} size={size} />
  </div>
);
