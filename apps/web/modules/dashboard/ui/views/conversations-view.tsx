import Image from "next/image";

export const ConversationsView = () => {
  return (
    <div className="flex flex-col flex-1 gap-y-4 h-full bg-muted">
      <div className="flex flex-1 justify-center items-center">
        <Image
          alt="Scylla"
          src="/logo.png"
          width={120}
          height={120}
          quality={85}
        />
      </div>
    </div>
  );
};
