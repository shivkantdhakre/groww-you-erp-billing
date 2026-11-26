import { useState, useRef } from "react";
import api from "../../utils/api";
import StatusBadge from "../common/StatusBadge";
import { ScanLine, UploadCloud, AlertCircle, Loader2, X, RotateCcw } from "lucide-react";

/**
 * Drag-and-drop & file-picker OCR intake panel for vendor purchase invoices.
 */
export default function InvoiceOcrUpload({
  onOcrSuccess,
  onClearOcr,
  hasOcrData,
  ocrConfidenceScore,
}) {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;

    setError("");

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please upload a smaller PDF or image.");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];
    const allowedExts = ["pdf", "jpg", "jpeg", "png", "webp"];
    const fileType = (file.type || "").toLowerCase();
    const fileExt = file.name?.split(".").pop()?.toLowerCase() || "";
    if (fileType ? !allowedTypes.includes(fileType) : !allowedExts.includes(fileExt)) {
      setError("Unsupported file format. Please upload a PDF, PNG, JPEG, or WEBP file.");
      return;
    }

    setLoading(true);
    setStatusText("Extracting invoice lines and supplier details...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/invoices/ocr", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data && res.data.success) {
        setStatusText("Extraction complete. Matching master records...");
        setTimeout(() => {
          setLoading(false);
          setStatusText("");
          onOcrSuccess(res.data, file);
        }, 400);
      } else {
        throw new Error(res.data?.error || "Failed to process invoice OCR.");
      }
    } catch (err) {
      console.error("[OCR Upload Error]", err);
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to extract invoice data using AI OCR. Please ensure the document is clear and legible.";
      setError(errMsg);
      setLoading(false);
      setStatusText("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
      e.target.value = "";
    }
  };

  return (
    <div className="bg-card p-4 sm:p-5 rounded-lg border border-border surface-shadow mb-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/20 text-primary-text flex items-center justify-center shrink-0">
            <ScanLine className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">AI Bill Scanner (OCR)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload supplier invoice (PDF, PNG, JPG, WEBP max 5MB, up to 3 pages) to prefill line items and GSTIN.
            </p>
          </div>
        </div>

        {hasOcrData && (
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge variant="success" className="tabular-nums">
              OCR Extracted ({ocrConfidenceScore || 90}% confidence)
            </StatusBadge>
            <button
              type="button"
              onClick={onClearOcr}
              className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md border border-border bg-background hover:bg-secondary transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear OCR</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3.5 px-3.5 py-2.5 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-start justify-between gap-2"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="leading-relaxed">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
            className="text-destructive/75 hover:text-destructive p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-6 px-4 rounded-md border border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-6 h-6 text-primary-text animate-spin mb-2" aria-hidden="true" />
          <p className="text-xs sm:text-sm font-medium text-foreground">{statusText}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Matching vendor GSTIN and inventory catalog items...
          </p>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`px-4 py-4 rounded-md border border-dashed transition-colors duration-150 cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-3 text-center sm:text-left ${
            dragActive
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/50 hover:bg-secondary/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-9 h-9 rounded-md bg-secondary border border-border flex items-center justify-center text-muted-foreground shrink-0">
            <UploadCloud className="w-4 h-4" aria-hidden="true" />
          </div>

          <div>
            <p className="text-xs sm:text-sm font-medium text-foreground">
              <span className="text-primary-text font-semibold underline decoration-primary/30 underline-offset-2">
                Click to upload
              </span>{" "}
              or drag and drop vendor bill
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              PDF, PNG, JPG, or WEBP up to 5MB
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
