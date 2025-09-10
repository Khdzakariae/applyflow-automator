import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailCampaign {
  id: string;
  name: string;
  send_type: 'all' | 'individual';
  status: 'draft' | 'sending' | 'completed' | 'failed';
  total_emails: number;
  sent_emails: number;
  created_at: string;
  completed_at: string | null;
}

export interface EmailCampaignJob {
  id: string;
  campaign_id: string;
  job_id: string;
  status: 'pending' | 'sent' | 'failed';
  sent_at: string | null;
}

export const useEmailCampaigns = () => {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as EmailCampaign[]);
    } catch (error: any) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const createCampaign = async (
    name: string,
    sendType: 'all' | 'individual',
    selectedJobIds: string[],
    selectedDocumentIds: string[]
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('email_campaigns')
        .insert({
          user_id: user.id,
          name,
          send_type: sendType,
          total_emails: selectedJobIds.length,
          status: 'draft'
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Add jobs to campaign
      const jobsData = selectedJobIds.map(jobId => ({
        campaign_id: campaign.id,
        job_id: jobId
      }));

      const { error: jobsError } = await supabase
        .from('email_campaign_jobs')
        .insert(jobsData);

      if (jobsError) throw jobsError;

      // Add documents to campaign
      if (selectedDocumentIds.length > 0) {
        const documentsData = selectedDocumentIds.map(docId => ({
          campaign_id: campaign.id,
          document_id: docId
        }));

        const { error: docsError } = await supabase
          .from('email_campaign_documents')
          .insert(documentsData);

        if (docsError) throw docsError;
      }

      setCampaigns(prev => [campaign as EmailCampaign, ...prev]);
      toast.success('Email campaign created successfully');
      return campaign;
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
      throw error;
    }
  };

  const updateCampaignStatus = async (campaignId: string, status: EmailCampaign['status']) => {
    try {
      const updates: any = { status };
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('email_campaigns')
        .update(updates)
        .eq('id', campaignId);

      if (error) throw error;

      setCampaigns(prev => prev.map(campaign =>
        campaign.id === campaignId ? { ...campaign, ...updates } as EmailCampaign : campaign
      ));
    } catch (error: any) {
      console.error('Error updating campaign status:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return {
    campaigns,
    isLoading,
    createCampaign,
    updateCampaignStatus,
    refetch: fetchCampaigns
  };
};