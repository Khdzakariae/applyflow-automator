import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  CheckCircle,
  Clock,
  Send,
  RefreshCw,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const initialStats = {
  totalJobs: 0,
  pendingJobs: 0,
  readyToSend: 0,
  doneJobs: 0,
  jobsWithMotivationLetters: 0
};

const Dashboard = () => {
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewingLetter, setViewingLetter] = useState(null);
  const [letterContent, setLetterContent] = useState('');
  const [isLetterLoading, setIsLetterLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchData = async () => {
    const token = localStorage.getItem("token");

    if (!token || token === "null") {
      setError("No valid authentication token found. Please log in again.");
      setIsLoading(false);
      toast.error("No valid authentication token found. Please log in again.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch jobs
      const jobsResponse = await fetch("http://localhost:3000/api/ausbildung", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!jobsResponse.ok) throw new Error("Failed to fetch jobs");
      const jobsData = await jobsResponse.json();
      setJobs(jobsData);

      // Fetch stats
      const statsResponse = await fetch("http://localhost:3000/api/ausbildung/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!statsResponse.ok) throw new Error("Failed to fetch stats");
      const statsData = await statsResponse.json();
      setStats(statsData);

      toast.success("Dashboard data refreshed successfully!");
    } catch (err) {
      setError(err.message);
      toast.error(err.message || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to determine job status
  const getJobStatus = (job) => {
    if (job.status === "Done") return "done";
    if (job.status === "Ready to Send" || job.motivationLetter) return "ready";
    return "pending";
  };

  // Function to view motivation letter
  const viewMotivationLetter = async (job) => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setIsLetterLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/ausbildung/${job.id}/letter`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("No motivation letter found for this job");
          return;
        }
        throw new Error("Failed to fetch motivation letter");
      }

      const data = await response.json();
      // Since letter is stored as PDF binary, show info message
      setLetterContent(`Motivation Letter Information:
      
Job: ${data.title}
Institution: ${data.institution}
Status: Letter available as PDF (${Math.round(data.letterSize / 1024)} KB)

The motivation letter is stored as a PDF file. 
Use the "Download PDF" button to view the complete letter.`);
      setViewingLetter(job);
    } catch (error) {
      toast.error(error.message || "Failed to load motivation letter");
    } finally {
      setIsLetterLoading(false);
    }
  };

  // Function to download motivation letter as PDF
  const downloadMotivationLetter = async (job) => {
    const token = localStorage.getItem("token");
    
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      const response = await fetch(`http://localhost:3000/api/ausbildung/${job.id}/letter/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("No motivation letter found for this job");
          return;
        }
        throw new Error("Failed to download motivation letter");
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bewerbung_${job.title.replace(/[^a-zA-Z0-9]/g, '_')}_${job.institution.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success("Motivation letter downloaded successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to download motivation letter");
    }
  };

  // Filter jobs based on search and status
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const jobStatus = getJobStatus(job);
    const matchesFilter = filterStatus === 'all' || jobStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (job) => {
    const status = getJobStatus(job);
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'ready': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };
  
  const getStatusText = (job) => {
    const status = getJobStatus(job);
    switch (status) {
      case 'done': return 'Done';
      case 'ready': return 'Ready to Send';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const getStatusIcon = (job) => {
    const status = getJobStatus(job);
    switch (status) {
      case 'done': return <CheckCircle className="w-4 h-4" />;
      case 'ready': return <Send className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-bold mb-2">Error Loading Dashboard</h2>
          <p className="mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
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
              <Button 
                onClick={fetchData} 
                disabled={isLoading}
                variant="outline"
                className="flex items-center"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
                  <p className="text-sm font-medium text-muted-foreground mb-1">Total Jobs</p>
                  <p className="text-2xl font-bold font-display">{stats.totalJobs}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600">
                  <Search className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pending</p>
                  <p className="text-2xl font-bold font-display">{stats.pendingJobs}</p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Ready to Send</p>
                  <p className="text-2xl font-bold font-display">{stats.readyToSend}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600">
                  <Send className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Done</p>
                  <p className="text-2xl font-bold font-display">{stats.doneJobs}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600">
                  <CheckCircle className="w-5 h-5" />
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
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="ready">Ready to Send</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <TableHead>Source</TableHead>
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
                            {job.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {job.startDate || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {job.source ? `${job.source}.de` : 'ausbildung.de'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(job)}
                              {getStatusText(job)}
                            </div>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm">
                              <a href={job.url} target="_blank" rel="noopener noreferrer" title="View Original Job">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            </Button>
                            {job.motivationLetter && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => viewMotivationLetter(job)}
                                  disabled={isLetterLoading}
                                  title="View Motivation Letter"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => downloadMotivationLetter(job)}
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredJobs.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'No jobs match your filters.' 
                      : 'No jobs found. Try scraping some!'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && (
                    <Button asChild>
                      <Link to="/scrape">Scrape Your First Jobs</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Motivation Letter Modal */}
        {viewingLetter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <div>
                  <h3 className="text-lg font-semibold">Motivation Letter</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewingLetter.title} - {viewingLetter.institution}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => downloadMotivationLetter(viewingLetter)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setViewingLetter(null)}
                  >
                    ✕
                  </Button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="text-center mb-4">
                    <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {letterContent}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button 
                      onClick={() => downloadMotivationLetter(viewingLetter)}
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download PDF to View Full Letter
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;