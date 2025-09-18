import React, { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Download,
  FileCheck,
  User,
  Eye
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { useDocuments } from '@/hooks/useDocuments';
import { toast } from 'sonner';

export const CVManager: React.FC = () => {
  const { documents, isLoading, isUploading, uploadDocument, deleteDocument, getDocumentUrl } = useDocuments();
  const [viewingCV, setViewingCV] = useState<string | null>(null);

  // Filter for CV documents only
  const cvDocuments = documents.filter(doc => doc.is_cv);
  const currentCV = cvDocuments[0]; // Assuming one CV per user

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      try {
        // Delete existing CV if any
        if (currentCV) {
          await deleteDocument(currentCV.id);
        }
        
        await uploadDocument(file, true); // Mark as CV
        toast.success('CV uploaded successfully!');
      } catch (error) {
        console.error('CV upload failed:', error);
      }
    }
  }, [uploadDocument, deleteDocument, currentCV]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: false,
    maxFiles: 1
  });

  const handleDownload = async () => {
    if (!currentCV) return;
    
    try {
      const url = await getDocumentUrl(currentCV.file_path);
      if (url) {
        const a = window.document.createElement('a');
        a.href = url;
        a.download = currentCV.name;
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
      }
    } catch (error) {
      toast.error('Failed to download CV');
    }
  };

  const handleView = async () => {
    if (!currentCV) return;
    
    try {
      const url = await getDocumentUrl(currentCV.file_path);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to view CV');
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
          <User className="w-5 h-5" />
          CV Manager
        </CardTitle>
        <CardDescription>
          Upload and manage your curriculum vitae (CV)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current CV Display */}
        {currentCV ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-800">
                  <FileCheck className="w-5 h-5 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-green-800 dark:text-green-200">{currentCV.name}</p>
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                      Current CV
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-green-700 dark:text-green-300">
                    <span>{formatFileSize(currentCV.file_size || 0)}</span>
                    <span>{new Date(currentCV.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleView}
                  className="text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
                >
                  <Download className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDocument(currentCV.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No CV uploaded yet</p>
            <p className="text-xs">Upload your CV to get started</p>
          </div>
        )}

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
            {isDragActive ? 'Drop your CV here' : currentCV ? 'Replace CV' : 'Upload CV'}
          </p>
          <p className="text-xs text-muted-foreground">
            Drag & drop your CV or click to browse (PDF, DOC, DOCX)
          </p>
          {currentCV && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              Uploading a new CV will replace your current one
            </p>
          )}
        </div>

        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
            <LoadingSpinner size="sm" />
            Uploading CV...
          </div>
        )}
      </CardContent>
    </Card>
  );
};