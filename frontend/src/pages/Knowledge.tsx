import { useState, useCallback } from "react";
import { Database, Upload, FileText, Trash2, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface KnowledgeFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: string;
}

const mockFiles: KnowledgeFile[] = [
  {
    id: "1",
    name: "product_catalog.txt",
    type: "text/plain",
    size: "24 KB",
    uploadedAt: "2025-03-01",
  },
  {
    id: "2",
    name: "faq_document.txt",
    type: "text/plain",
    size: "18 KB",
    uploadedAt: "2025-02-28",
  },
  {
    id: "3",
    name: "company_policies.txt",
    type: "text/plain",
    size: "32 KB",
    uploadedAt: "2025-02-25",
  },
];

export default function Knowledge() {
  const [files, setFiles] = useState<KnowledgeFile[]>(mockFiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      setIsUploading(true);

      // Simulate file upload
      setTimeout(() => {
        const newFiles: KnowledgeFile[] = Array.from(selectedFiles).map((file) => ({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.type || "text/plain",
          size: `${(file.size / 1024).toFixed(0)} KB`,
          uploadedAt: new Date().toISOString().split("T")[0],
        }));

        setFiles((prev) => [...newFiles, ...prev]);
        setIsUploading(false);
      }, 1000);
    },
    []
  );

  const handleDeleteFile = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleAddTextFile = () => {
    const fileName = prompt("Enter file name:");
    if (!fileName) return;

    const content = prompt("Enter file content:");
    if (content === null) return;

    const newFile: KnowledgeFile = {
      id: Date.now().toString(),
      name: fileName.endsWith(".txt") ? fileName : `${fileName}.txt`,
      type: "text/plain",
      size: `${(content.length / 1024).toFixed(0)} KB`,
      uploadedAt: new Date().toISOString().split("T")[0],
    };

    setFiles((prev) => [newFile, ...prev]);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Knowledge Database</h1>
        <p className="text-sm text-muted-foreground">
          Manage documents and text files for your agents
        </p>
      </div>
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTextFile}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Text
            </Button>
            <Button
              size="sm"
              className="gap-2"
              disabled={isUploading}
              asChild
            >
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload File"}
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.csv,.json"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
            </Button>
          </div>
        </div>

        {/* Files List */}
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border/30 px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Documents ({filteredFiles.length})
            </h2>
          </div>
          {filteredFiles.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "No files match your search" : "No documents uploaded yet"}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Upload text files to enrich your agent's knowledge
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.size} • Uploaded {file.uploadedAt}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteFile(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm text-primary font-medium mb-1">Supported Formats</p>
          <p className="text-xs text-primary/80">
            Upload .txt, .md, .csv, or .json files to add context to your agents.
            The content will be used to enhance agent responses.
          </p>
        </div>
    </div>
  );
}
