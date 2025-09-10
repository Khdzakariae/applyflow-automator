import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Document {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  is_cv: boolean;
  created_at: string;
}

export const useDocuments = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (file: File, isCV: boolean = false) => {
    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document record to database
      const { data, error } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: file.name,
          file_path: uploadData.path,
          file_type: file.type,
          file_size: file.size,
          is_cv: isCV
        })
        .select()
        .single();

      if (error) throw error;

      setDocuments(prev => [data, ...prev]);
      toast.success(`${isCV ? 'CV' : 'Document'} uploaded successfully`);
      return data;
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    try {
      const document = documents.find(d => d.id === documentId);
      if (!document) return;

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;

      setDocuments(prev => prev.filter(d => d.id !== documentId));
      toast.success('Document deleted successfully');
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const getDocumentUrl = async (filePath: string) => {
    try {
      const { data } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      return data?.signedUrl;
    } catch (error: any) {
      console.error('Error getting document URL:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  return {
    documents,
    isLoading,
    isUploading,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
    refetch: fetchDocuments
  };
};