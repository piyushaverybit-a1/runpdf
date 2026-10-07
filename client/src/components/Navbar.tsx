import { useRef, useState } from "react";
import { MessageSquare, UploadCloud, Bot, Loader2 } from "lucide-react";

export function Navbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append("pdf", file);

      const res = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      setUploadMessage(
        result.success
          ? { type: "success", text: result.message || "PDF processed successfully" }
          : { type: "error", text: result.error || "Failed to process PDF" },
      );
    } catch {
      setUploadMessage({
        type: "error",
        text: "An error occurred while processing the PDF",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
        <a
          href="/"
          className="flex items-center gap-2.5 font-semibold text-foreground tracking-tight transition-opacity"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10a37f] text-white shadow-xs">
            <Bot className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold">Agent AI</span>
        </a>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <a
            href="/"
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-full bg-foreground text-background shadow-xs hover:bg-foreground/90 transition-all duration-150"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Chat</span>
          </a>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            aria-label="Choose a PDF to upload"
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground disabled:cursor-wait disabled:opacity-70 cursor-pointer"
          >
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            <span>{isUploading ? "Processing..." : "Upload PDF"}</span>
          </button>
        </nav>
      </div>
      {uploadMessage && (
        <p
          role="status"
          className={`mx-auto max-w-6xl px-4 pb-2 text-sm sm:px-6 ${
            uploadMessage.type === "error" ? "text-destructive" : "text-primary"
          }`}
        >
          {uploadMessage.text}
        </p>
      )}
    </header>
  );
}
