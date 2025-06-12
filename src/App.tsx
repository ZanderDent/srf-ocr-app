import React, { useRef, useState } from "react";

const App: React.FC = () => {
  const [ocrLines, setOcrLines] = useState<string[]>([]);
  const [showExport, setShowExport] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Handle file upload (PDF)
  const handleFile = (file: File | null) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/ocr", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        setOcrLines(data.lines || []);
        setShowExport(true);
      });
  };

  // Drag and drop handlers
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Camera functionality
  const startCamera = () => {
    if (videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        videoRef.current!.srcObject = stream;
        videoRef.current!.style.display = "block";
      });
    }
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
      // Stop camera
      (videoRef.current.srcObject as MediaStream)
        ?.getTracks()
        .forEach((track) => track.stop());
      videoRef.current.style.display = "none";
      // For demo: send blank POST, replace with actual image upload if needed
      fetch("/api/ocr", { method: "POST" })
        .then((res) => res.json())
        .then((data) => {
          setOcrLines(data.lines || []);
          setShowExport(true);
        });
    }
  };

  // Export functions
  const exportExcel = () => {
    // @ts-ignore
    const ws = XLSX.utils.aoa_to_sheet(ocrLines.map((line) => [line]));
    // @ts-ignore
    const wb = XLSX.utils.book_new();
    // @ts-ignore
    XLSX.utils.book_append_sheet(wb, ws, "OCR Result");
    // @ts-ignore
    XLSX.writeFile(wb, "ocr_result.xlsx");
  };

  const exportCSV = () => {
    const csv = ocrLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ocr_result.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWord = () => {
    // @ts-ignore
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: ocrLines.map(
            (line: string) =>
              new Paragraph({
                children: [new TextRun(line)],
                spacing: { after: 120 },
              })
          ),
        },
      ],
    });
    // @ts-ignore
    Packer.toBlob(doc).then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ocr_result.docx";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: "2em auto", fontFamily: "sans-serif" }}>
      <img src="/logo.jpg" alt="SRF Logo" style={{ height: 60, marginBottom: "1em" }} />
      <h1>SRF OCR Tool</h1>
      {/* Drag-and-drop area */}
      <div
        className="drop-area"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{
          border: "2px dashed #aaa",
          borderRadius: 8,
          padding: 24,
          marginBottom: 24,
          textAlign: "center",
        }}
      >
        <p>
          Drag &amp; drop PDF here or{" "}
          <input
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            id="fileElem"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
          <button onClick={() => document.getElementById("fileElem")?.click()}>Browse</button>
        </p>
      </div>
      {/* Camera area */}
      <div className="camera-area" style={{ marginBottom: 24, textAlign: "center" }}>
        <button onClick={startCamera}>Use Camera</button>
        <div>
          <video ref={videoRef} width={320} height={240} autoPlay style={{ display: "none" }} />
          <button onClick={capture} style={{ display: videoRef.current?.style.display === "block" ? "inline-block" : "none" }}>
            Capture
          </button>
          <canvas ref={canvasRef} width={320} height={240} style={{ display: "none" }} />
        </div>
      </div>
      {/* OCR result */}
      <div id="ocr-result" style={{ whiteSpace: "pre-wrap", minHeight: 80, marginBottom: 24 }}>
        {ocrLines.length > 0 && ocrLines.join("\n")}
      </div>
      {/* Export buttons */}
      {showExport && (
        <div className="export-btns" style={{ textAlign: "center" }}>
          <button onClick={exportExcel}>Export as Excel</button>{" "}
          <button onClick={exportCSV}>Export as CSV</button>{" "}
          <button onClick={exportWord}>Export as Word</button>
        </div>
      )}
    </div>
  );
};

export default App;
