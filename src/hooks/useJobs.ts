import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Job {
  id: string;
  title: string;
  institution: string;
  location: string | null;
  start_date: string | null;
  description: string | null;
  contact_email: string | null;
  source_url: string | null;
  letter_generated: boolean;
  letter_path: string | null;
  created_at: string;
  updated_at: string;
}

export const useJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const getReadyJobs = () => {
    return jobs.filter(job => job.letter_generated && job.contact_email);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return {
    jobs,
    readyJobs: getReadyJobs(),
    isLoading,
    refetch: fetchJobs
  };
};