import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  FileCheck,
  Plus
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useDocuments, Document } from '@/hooks/useDocuments';
import { toast } from 'sonner';

interface DocumentManagerProps {
  selectedDocuments: string[];
  onDocumentSelect: (documentId: string, checked: boolean) => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  selectedDocuments,
  onDocumentSelect
}) => {
  const { documents, isLoading, isUploading, uploadDocument, deleteDocument, getDocumentUrl } = useDocuments();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        await uploadDocument(file, file.name.toLowerCase().includes('cv') || file.name.toLowerCase().includes('lebenslauf'));
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  });

  const handleDownload = async (document: Document) => {
    try {
      const url = await getDocumentUrl(document.file_path);
      if (url) {
        const a = window.document.createElement('a');
        a.href = url;
        a.download = document.name;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
      }
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Document Manager
        </CardTitle>
        <CardDescription>
          Upload and manage documents to attach to your email applications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            {isDragActive ? 'Drop files here' : 'Upload Documents'}
          </p>
          <p className="text-xs text-muted-foreground">
            Drag & drop files or click to browse (PDF, DOC, DOCX)
          </p>
        </div>

        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoadingSpinner size="sm" />
            Uploading document...
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Your Documents ({documents.length})</h4>
            {documents.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => {
                documents.forEach(doc => onDocumentSelect(doc.id, true));
              }}>
                Select All
              </Button>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {documents.map((document) => (
                <motion.div
                  key={document.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`
                    flex items-center gap-3 p-3 border rounded-lg transition-colors
                    ${selectedDocuments.includes(document.id) ? 'bg-muted/50 border-primary/30' : 'hover:bg-muted/30'}
                  `}
                >
                  <Checkbox
                    checked={selectedDocuments.includes(document.id)}
                    onCheckedChange={(checked) => onDocumentSelect(document.id, checked as boolean)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate">{document.name}</p>
                      {document.is_cv && (
                        <Badge variant="secondary" className="text-xs">CV</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatFileSize(document.file_size)}</span>
                      <span>{new Date(document.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document)}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDocument(document.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};