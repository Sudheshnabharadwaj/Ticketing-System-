import React, { useRef } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, File, Upload } from 'lucide-react';
import { Button } from './Button';

export interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  file?: File;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface AttachmentFilePickerProps {
  files: AttachedFile[];
  onFilesChange: (files: AttachedFile[]) => void;
  label?: string;
  buttonText?: string;
  compact?: boolean;
}

export const AttachmentFilePicker: React.FC<AttachmentFilePickerProps> = ({
  files,
  onFilesChange,
  label = 'Attachments',
  buttonText = 'Attach Files',
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    const newFiles: AttachedFile[] = Array.from(selected).map((f) => ({
      id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: f.name,
      size: formatFileSize(f.size),
      type: f.type || 'Document',
      file: f,
    }));

    onFilesChange([...files, ...newFiles]);

    // Reset input value so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    onFilesChange(files.filter((f) => f.id !== id));
  };

  const getFileIcon = (name: string, type: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '') || type.startsWith('image/')) {
      return <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(ext || '') || type.includes('pdf') || type.includes('word')) {
      return <FileText className="w-4 h-4 text-indigo-600 shrink-0" />;
    }
    return <File className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  return (
    <div className="space-y-2 font-sans">
      {label && <label className="block text-xs font-bold text-slate-700">{label}</label>}

      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        multiple
        className="hidden"
      />

      {/* Action Trigger Button / Drop Area */}
      {compact ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          icon={<Paperclip className="w-3.5 h-3.5 text-[#0284C7]" />}
          className="border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
        >
          {buttonText}
        </Button>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 hover:border-[#0284C7] bg-slate-50/50 hover:bg-sky-50/30 rounded-xl p-3.5 text-center cursor-pointer transition-all"
        >
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-700">
            <Upload className="w-4 h-4 text-[#0284C7]" />
            <span>{buttonText}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Click to browse files from your computer (PDF, images, logs, docs)
          </p>
        </div>
      )}

      {/* List of Selected Files */}
      {files.length > 0 && (
        <div className="space-y-1.5 mt-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-2 px-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs text-xs group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                {getFileIcon(f.name, f.type)}
                <div className="min-w-0">
                  <div className="font-semibold text-slate-800 truncate" title={f.name}>
                    {f.name}
                  </div>
                  <div className="text-[10.5px] text-slate-400 font-mono">{f.size}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveFile(f.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                title="Remove file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
