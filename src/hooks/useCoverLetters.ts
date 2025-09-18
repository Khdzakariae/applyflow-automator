import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CoverLetter {
  id: string;
  title: string;
  institution: string;
  letter_path: string;
  letter_generated: boolean;
  created_at: string;
}

export const useCoverLetters = () => {
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCoverLetters = async () => {
    try {
      // Since cover letters are stored as job records with letter_path, 
      // we'll fetch jobs that have letters generated
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .not('letter_path', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoverLetters(data || []);
    } catch (error: any) {
      console.error('Error fetching cover letters:', error);
      toast.error('Failed to load cover letters');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCoverLetter = async (jobId: string) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-cover-letter', {
        body: { jobId }
      });

      if (error) throw error;

      await fetchCoverLetters(); // Refresh the list
      toast.success('Cover letter generated successfully!');
      return data;
    } catch (error: any) {
      console.error('Error generating cover letter:', error);
      toast.error('Failed to generate cover letter');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const getCoverLetterUrl = async (letterPath: string) => {
    try {
      const { data } = await supabase.storage
        .from('motivation-letters')
        .createSignedUrl(letterPath, 3600); // 1 hour expiry

      return data?.signedUrl;
    } catch (error: any) {
      console.error('Error getting cover letter URL:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchCoverLetters();
  }, []);

  return {
    coverLetters,
    isLoading,
    isGenerating,
    generateCoverLetter,
    getCoverLetterUrl,
    refetch: fetchCoverLetters
  };
};