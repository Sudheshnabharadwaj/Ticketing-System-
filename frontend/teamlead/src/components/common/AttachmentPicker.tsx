import React, { useRef, useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, X, AlertCircle, UploadCloud } from 'lucide-react';

export interface FileAttachmentItem {
  id: string;
  file?: File;
  name: string;
  size: string;
}

interface AttachmentPickerProps {
  attachments: FileAttachmentItem[];
  onChange: (attachments: FileAttachmentItem[]) => void;
  maxFiles?: number;
  className?: string;
}

const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg',
  '.pdf', '.doc', '.docx', '.txt', '.csv', '.log', '.json',
  '.xml', '.md', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.rar', '.7z', '.tar', '.gz'
];

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  attachments,
  onChange,
  maxFiles = 10,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const processFiles = (fileList: FileList | File[]) => {
    setErrorMsg(null);
    const files = Array.from(fileList);
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > maxFiles) {
      setErrorMsg(`You can attach up to ${maxFiles} files maximum.`);
      return;
    }

    const newItems: FileAttachmentItem[] = [];
    const skippedTypes: string[] = [];
    const oversizedFiles: string[] = [];

    files.forEach((file) => {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        skippedTypes.push(file.name);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversizedFiles.push(file.name);
        return;
      }

      const isDuplicate = attachments.some((att) => att.name.toLowerCase() === file.name.toLowerCase());
      if (!isDuplicate) {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          name: file.name,
          size: formatFileSize(file.size),
        });
      }
    });

    if (skippedTypes.length > 0) {
      setErrorMsg(`Unsupported file type: ${skippedTypes.slice(0, 2).join(', ')}. Allowed: PDF, Word, Excel, PowerPoint, Images, TXT, CSV, Zip.`);
    } else if (oversizedFiles.length > 0) {
      setErrorMsg(`File exceeds 25 MB limit: ${oversizedFiles.slice(0, 2).join(', ')}.`);
    }

    if (newItems.length > 0) {
      onChange([...attachments, ...newItems]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange(attachments.filter((item) => item.id !== id));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-sky-600 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-sky-600 shrink-0" />;
  };

  return (
    <div className={`space-y-2 text-xs ${className}`}>
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.pdf,.doc,.docx,.txt,.csv,.log,.json,.xml,.md,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.tar,.gz"
        className="hidden"
      />

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleButtonClick}
        className={`p-3.5 border-2 border-dashed rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-2.5 ${
          isDragging
            ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-300'
            : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 hover:border-sky-400'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
            <UploadCloud className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-xs">
              Drag & drop files here, or <span className="text-sky-600 underline">browse</span>
            </p>
            <p className="text-[11px] text-slate-400">
              PDF, DOC, DOCX, XLS, XLSX, PPT, Images, TXT, CSV, ZIP (up to 25 MB)
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleButtonClick}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-sky-700 font-semibold rounded-lg border border-sky-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs shrink-0"
        >
          <Paperclip className="w-3.5 h-3.5 text-sky-600" />
          <span>Attach Files</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex items-center gap-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Selected Files ({attachments.length})</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange([]);
              }}
              className="text-[10px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {attachments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs hover:border-sky-300 transition-colors shadow-2xs"
              >
                <div className="flex items-center space-x-2 truncate min-w-0 pr-2">
                  {getFileIcon(item.name)}
                  <span className="font-semibold text-slate-800 truncate" title={item.name}>
                    {item.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal shrink-0">
                    ({item.size})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemove(item.id, e)}
                  className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
