import { useState, useRef } from "react";
import api from "../../utils/api";

export default function InvoiceOcrUpload({ onOcrSuccess, onClearOcr, hasOcrData, ocrConfidenceScore }) {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;

    // Reset messages
    setError("");

    // 1. Client-Side Size Validation (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit. Please upload a smaller PDF or image.");
      return;
    }

    // 2. Client-Side Mime / Extension Validation
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedExts = ["pdf", "jpg", "jpeg", "png", "webp"];
    const fileType = (file.type || "").toLowerCase();
    const fileExt = file.name?.split(".").pop()?.toLowerCase() || "";
    if (fileType ? !allowedTypes.includes(fileType) : !allowedExts.includes(fileExt)) {
      setError("Unsupported file format. Please upload a PDF, PNG, JPEG, or WEBP file.");
      return;
    }

    setLoading(true);
    setStatusText("Analyzing document with Gemini Vision AI...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post("/invoices/ocr", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      if (res.data && res.data.success) {
        setStatusText("Extraction complete! Fuzzy matching master data...");
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
        "Failed to parse document with Gemini AI.";
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
    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm mb-6 transition-all duration-200">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
            Multimodal AI OCR Scanner
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Upload vendor invoice or receipt (PDF, PNG, JPG max 5MB, &le;3 pages). Gemini AI will auto-populate the form.
          </p>
        </div>

        {hasOcrData && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              AI Parsed ({ocrConfidenceScore || 90}% confidence)
            </span>
            <button
              onClick={onClearOcr}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition duration-150 cursor-pointer"
            >
              Clear OCR Data
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-destructive/70 hover:text-destructive text-sm font-bold cursor-pointer">&times;</button>
        </div>
      )}

      {loading ? (
        <div className="p-8 rounded-xl border-2 border-dashed border-indigo-500/30 bg-indigo-500/5 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-semibold text-foreground">{statusText}</p>
          <p className="text-xs text-muted-foreground mt-1">Please wait while Gemini processes the document and matches tenant records...</p>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center ${
            dragActive
              ? "border-indigo-500 bg-indigo-500/10 scale-[1.005]"
              : "border-border hover:border-indigo-500/50 hover:bg-secondary/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3 text-muted-foreground group-hover:text-indigo-500 transition duration-150">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="text-sm font-semibold text-foreground">
            <span className="text-indigo-500 font-bold">Click to upload</span> or drag and drop invoice / receipt
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports PDF, PNG, JPG or WEBP (Max 5MB, up to 3 pages)
          </p>
        </div>
      )}
    </div>
  );
}
