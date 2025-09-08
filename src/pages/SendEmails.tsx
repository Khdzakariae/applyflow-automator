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
  Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

// Mock data for jobs ready to send
const mockReadyJobs = [
  {
    id: '2',
    title: 'Gesundheits- und Krankenpfleger',
    institution: 'Charité Berlin',
    location: 'Berlin, Deutschland',
    startDate: '2024-04-01',
    letterGenerated: true,
    emailSent: false,
    contactEmail: 'hr@charite.de'
  },
  {
    id: '6',
    title: 'Pflegefachkraft Neurologie',
    institution: 'Universitätsklinikum Hamburg',
    location: 'Hamburg, Deutschland',
    startDate: '2024-04-15',
    letterGenerated: true,
    emailSent: false,
    contactEmail: 'bewerbung@uke.de'
  },
  {
    id: '7',
    title: 'Intensivpfleger (m/w/d)',
    institution: 'Klinikum Nürnberg',
    location: 'Nürnberg, Bayern',
    startDate: '2024-03-20',
    letterGenerated: true,
    emailSent: false,
    contactEmail: 'personal@klinikum-nuernberg.de'
  },
];

// Mock data for sent applications
const mockSentApplications = [
  {
    id: '1',
    title: 'Pflegefachmann/frau',
    institution: 'Universitätsklinikum München',
    location: 'München, Bayern',
    sentDate: '2024-01-15',
    status: 'Delivered'
  },
  {
    id: '4',
    title: 'Pflegefachkraft Intensivstation',
    institution: 'Klinikum Stuttgart',
    location: 'Stuttgart, Baden-Württemberg',
    sentDate: '2024-01-20',
    status: 'Delivered'
  },
];

const SendEmails = () => {
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sendingComplete, setSendingComplete] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(mockReadyJobs.map(job => job.id));
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

  const handleSendEmails = async () => {
    if (selectedJobs.length === 0) {
      toast.error('Please select at least one job to send applications');
      return;
    }

    setIsSending(true);
    setProgress(0);
    setSendingComplete(false);

    // Simulate sending emails
    const totalEmails = selectedJobs.length;
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / totalEmails);
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsSending(false);
          setSendingComplete(true);
          setSentCount(totalEmails);
          toast.success(`Successfully sent ${totalEmails} applications!`);
          return 100;
        }
        return newProgress;
      });
    }, 800);
  };

  const handleReset = () => {
    setSelectedJobs([]);
    setProgress(0);
    setSendingComplete(false);
    setSentCount(0);
  };

  const allSelected = selectedJobs.length === mockReadyJobs.length && mockReadyJobs.length > 0;
  const someSelected = selectedJobs.length > 0;

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
                        Ready to Send ({mockReadyJobs.length})
                      </CardTitle>
                      <CardDescription>
                        Jobs with generated motivation letters ready for application
                      </CardDescription>
                    </div>
                    {mockReadyJobs.length > 0 && (
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
                  {mockReadyJobs.length === 0 ? (
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
                            {mockReadyJobs.map((job) => (
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
                                    {new Date(job.startDate).toLocaleDateString('de-DE')}
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
                          {selectedJobs.length} of {mockReadyJobs.length} applications selected
                        </p>
                        <Button
                          onClick={handleSendEmails}
                          disabled={selectedJobs.length === 0 || isSending || sendingComplete}
                          className="hero-button"
                        >
                          {isSending ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send {selectedJobs.length} Application{selectedJobs.length !== 1 ? 's' : ''}
                            </>
                          )}
                        </Button>
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
                  {mockSentApplications.length === 0 ? (
                    <div className="text-center py-6">
                      <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No applications sent yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {mockSentApplications.map((app) => (
                        <div key={app.id} className="p-3 border border-border rounded-lg">
                          <div className="font-medium text-sm mb-1">{app.title}</div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {app.institution}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {new Date(app.sentDate).toLocaleDateString('de-DE')}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {app.status}
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