import { AlertCircle } from "lucide-react";

interface ErrorBannerProps {
  message: string | null;
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null;
  return (
    <div className="mt-4 flex items-start gap-2 rounded-xl border border-error/30 bg-error/[0.08] px-4 py-3 text-[13.5px] text-error">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
      <span>{message}</span>
    </div>
  );
}
