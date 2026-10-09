import React, { useRef, useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, X, AlertCircle } from 'lucide-react';

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
  '.jpg', '.jpeg', '.png', '.webp',
  '.pdf', '.doc', '.docx', '.txt',
  '.csv', '.xls', '.xlsx'
];

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
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: FileAttachmentItem[] = [];
    let hasInvalid = false;

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        hasInvalid = true;
        return;
      }

      // Check if file already added
      const isDuplicate = attachments.some((att) => att.name === file.name);
      if (!isDuplicate) {
        newItems.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: formatFileSize(file.size),
        });
      }
    });

    if (hasInvalid) {
      setErrorMsg('Some files were skipped. Allowed types: Images (JPG, PNG, WEBP), Documents (PDF, DOC, DOCX, TXT), Data (CSV, XLS, XLSX).');
    }

    if (newItems.length > 0) {
      onChange([...attachments, ...newItems]);
    }

    // Reset input so re-selecting same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (id: string) => {
    onChange(attachments.filter((item) => item.id !== id));
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) {
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
        accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
        className="hidden"
      />

      {/* Attach Files Button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleButtonClick}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs text-xs"
        >
          <Paperclip className="w-3.5 h-3.5 text-slate-600" />
          <span>Attach Files</span>
        </button>
        <span className="text-[11px] text-slate-400">JPG, PNG, WEBP, PDF, DOC, TXT, CSV, XLS</span>
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
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Selected Files ({attachments.length})
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {attachments.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs hover:bg-slate-100/80 transition-colors"
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
                  onClick={() => handleRemove(item.id)}
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
