import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ExternalLink,
  MapPin,
  Calendar,
  Building2,
  FileText,
  Plus,
  TrendingUp,
  Mail,
  Users,
  Clock
} from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useDocuments } from '@/hooks/useDocuments';
import { useEmailCampaigns } from '@/hooks/useEmailCampaigns';

const Dashboard = () => {
  const { jobs, readyJobs, isLoading: jobsLoading } = useJobs();
  const { documents, isLoading: docsLoading } = useDocuments();
  const { campaigns, isLoading: campaignsLoading } = useEmailCampaigns();
  
  const [searchTerm, setSearchTerm] = useState('');

  const cvDocuments = documents.filter(doc => doc.is_cv);
  const otherDocuments = documents.filter(doc => !doc.is_cv);
  const completedCampaigns = campaigns.filter(c => c.status === 'completed');

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const getStatusColor = (job: any) => {
    if (completedCampaigns.some(c => c.id === job.id)) return 'bg-green-100 text-green-800';
    if (job.letter_generated) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };
  
  const getStatusText = (job: any) => {
    if (completedCampaigns.some(c => c.id === job.id)) return 'Applied';
    if (job.letter_generated) return 'Ready to Send';
    return 'Pending Letter';
  };

  const isLoading = jobsLoading || docsLoading || campaignsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Track your job applications and automate your search
              </p>
            </div>
            <div className="flex gap-3">
              <Button asChild className="hero-button">
                <Link to="/scrape">
                  <Plus className="w-4 h-4 mr-2" />
                  Scrape Jobs
                </Link>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Jobs Found</p>
                  <p className="text-2xl font-bold font-display">{jobs.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-blue-600">
                  <Search className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Letters Generated</p>
                  <p className="text-2xl font-bold font-display">{readyJobs.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-green-600">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Documents</p>
                  <p className="text-2xl font-bold font-display">{documents.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-purple-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Applications Sent</p>
                  <p className="text-2xl font-bold font-display">{completedCampaigns.length}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-orange-600">
                  <Mail className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Jobs Table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-display">Job Applications</CardTitle>
                  <CardDescription>
                    Manage and track all your scraped job opportunities
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full sm:w-[250px]"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((job) => (
                      <TableRow key={job.id}>
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
                            {job.location || 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {job.start_date ? new Date(job.start_date).toLocaleDateString('de-DE') : 'Not specified'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job)}>
                            {getStatusText(job)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm">
                            <a href={job.source_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredJobs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No jobs found. Try scraping some!</p>
                  <Button asChild>
                    <Link to="/scrape">Scrape Your First Jobs</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;