import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Mail, 
  Send, 
  CheckCircle,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  FileCheck,
  Clock,
  Eye,
  Filter,
  Plus,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useJobs } from '@/hooks/useJobs';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';
import { supabase } from '@/integrations/supabase/client';
import { DocumentManager } from '@/components/email/DocumentManager';

// ... keep existing code (mock data for sent applications section will be replaced with real data)

const SendEmails = () => {
  const { readyJobs, isLoading: jobsLoading } = useJobs();
  const { campaigns, createCampaign, updateCampaignStatus } = useEmailCampaigns();
  
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [sendType, setSendType] = useState<'all' | 'individual'>('all');
  const [campaignName, setCampaignName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendingComplete, setSendingComplete] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(readyJobs.map(job => job.id));
    } else {
      setSelectedJobs([]);
    }
  };

  const handleSelectJob = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobs(prev => [...prev, jobId]);
    } else {
      setSelectedJobs(prev => prev.filter(id => id !== jobId));
    }
  };

  const handleDocumentSelect = (documentId: string, checked: boolean) => {
    if (checked) {
      setSelectedDocuments(prev => [...prev, documentId]);
    } else {
      setSelectedDocuments(prev => prev.filter(id => id !== documentId));
    }
  };

  const handleCreateCampaign = async () => {
    if (selectedJobs.length === 0) {
      toast.error('Please select at least one job');
      return;
    }

    if (!campaignName.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }

    try {
      const campaign = await createCampaign(
        campaignName.trim(),
        sendType,
        selectedJobs,
        selectedDocuments
      );
      
      setShowCreateCampaign(false);
      setCampaignName('');
      
      // Start sending process
      await handleSendCampaign(campaign.id);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleSendCampaign = async (campaignId: string) => {
    setIsSending(true);
    setProgress(0);
    setSendingComplete(false);

    try {
      await updateCampaignStatus(campaignId, 'sending');
      
      // Get JWT token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token found');
      }
      
      // Call backend API to send emails
      const response = await fetch('http://localhost:3000/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send emails');
      }

      const emailData = await response.json();

      setProgress(100);
      setSentCount(emailData?.sentCount || 0);
      setSendingComplete(true);
      setIsSending(false);
      
      await updateCampaignStatus(campaignId, 'completed');
      toast.success(`Successfully sent ${emailData?.sentCount || 0} emails!`);
      
      if (emailData?.errors && emailData.errors.length > 0) {
        toast.warning(`Some emails failed to send: ${emailData.errors.length} errors`);
      }
    } catch (error) {
      setIsSending(false);
      await updateCampaignStatus(campaignId, 'failed');
      toast.error(`Failed to send emails: ${error.message}`);
      console.error('Email sending error:', error);
    }
  };

  const handleReset = () => {
    setSelectedJobs([]);
    setSelectedDocuments([]);
    setProgress(0);
    setSendingComplete(false);
    setSentCount(0);
  };

  const allSelected = selectedJobs.length === readyJobs.length && readyJobs.length > 0;
  const someSelected = selectedJobs.length > 0;
  const sentApplications = campaigns.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">Send Email Applications</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Review and send your personalized job applications. Select the positions you want to apply for and send them all at once.
            </p>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Ready to Send Section */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="shadow-elegant">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-display flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-primary" />
                        Ready to Send ({readyJobs.length})
                      </CardTitle>
                      <CardDescription>
                        Jobs with generated motivation letters ready for application
                      </CardDescription>
                    </div>
                    {readyJobs.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">Select All</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {readyJobs.length === 0 ? (
                    <div className="text-center py-8">
                      <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Applications Ready</h3>
                      <p className="text-muted-foreground mb-4">
                        Generate motivation letters first to prepare applications for sending.
                      </p>
                      <Button asChild>
                        <Link to="/generate">Generate Letters</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Position</TableHead>
                              <TableHead>Institution</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Start Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {readyJobs.map((job) => (
                              <TableRow key={job.id} className={selectedJobs.includes(job.id) ? 'bg-muted/50' : ''}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedJobs.includes(job.id)}
                                    onCheckedChange={(checked) => handleSelectJob(job.id, checked as boolean)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{job.title}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    {job.institution}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    {job.location}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    {job.start_date ? new Date(job.start_date).toLocaleDateString('de-DE') : 'Not specified'}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {isSending && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-6 space-y-4 p-4 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <LoadingSpinner size="sm" />
                            Sending applications...
                          </div>
                          <Progress value={progress} className="w-full" />
                          <p className="text-xs text-muted-foreground">
                            Sending email {Math.ceil((progress / 100) * selectedJobs.length)} of {selectedJobs.length}...
                          </p>
                        </motion.div>
                      )}

                      {sendingComplete && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                        >
                          <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-medium mb-2">
                            <CheckCircle className="w-5 h-5" />
                            Applications Sent Successfully!
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                            Sent {sentCount} job applications successfully
                          </p>
                          <div className="flex gap-2">
                            <Button asChild size="sm">
                              <Link to="/dashboard">
                                View Dashboard
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleReset}>
                              Send More
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      <div className="mt-6 flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {selectedJobs.length} of {readyJobs.length} applications selected
                        </p>
                        
                        <Dialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign}>
                          <DialogTrigger asChild>
                            <Button
                              disabled={selectedJobs.length === 0 || isSending || sendingComplete}
                              className="hero-button"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Create Campaign
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Create Email Campaign</DialogTitle>
                              <DialogDescription>
                                Configure your email campaign settings and select additional documents to attach
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-6 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="campaign-name">Campaign Name</Label>
                                <Input
                                  id="campaign-name"
                                  placeholder="Enter campaign name..."
                                  value={campaignName}
                                  onChange={(e) => setCampaignName(e.target.value)}
                                />
                              </div>
                              
                              <div className="space-y-4">
                                <h4 className="font-medium">Additional Documents</h4>
                                <DocumentManager 
                                  selectedDocuments={selectedDocuments}
                                  onDocumentSelect={handleDocumentSelect}
                                />
                              </div>
                              
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  onClick={() => setShowCreateCampaign(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleCreateCampaign}
                                  disabled={!campaignName}
                                >
                                  Create & Send
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sent Applications Log */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Sent Applications
                  </CardTitle>
                  <CardDescription>
                    History of your sent job applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sentApplications.length === 0 ? (
                    <div className="text-center py-6">
                      <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No applications sent yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sentApplications.slice(0, 5).map((campaign) => (
                        <div key={campaign.id} className="p-3 border border-border rounded-lg">
                          <div className="font-medium text-sm mb-1">{campaign.name}</div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {campaign.total_emails} emails sent
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {new Date(campaign.completed_at!).toLocaleDateString('de-DE')}</div>
                            <Badge variant="outline" className="text-xs">
                              {campaign.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendEmails;