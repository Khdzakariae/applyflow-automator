import React, { useState, useEffect } from 'react'; // Import useEffect
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner'; // Assuming you have this

// MODIFIED: We will fetch stats from the API instead of using a mock object.
const initialStats = {
  totalJobs: 0,
  jobsWithMotivationLetters: 0,
  // Add other stats if your API provides them
};

const Dashboard = () => {
  // MODIFIED: State for jobs, stats, loading, and errors
  const [jobs, setJobs] = useState([]);
  const [stats, setStats] = useState(initialStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // MODIFIED: useEffect to fetch data from your API when the component loads
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch jobs from your API
        const jobsResponse = await fetch('http://localhost:3000/api/jobs');
        if (!jobsResponse.ok) throw new Error('Failed to fetch jobs');
        const jobsData = await jobsResponse.json();
        setJobs(jobsData);

        // Fetch stats from your API
        const statsResponse = await fetch('http://localhost:3000/api/stats');
        if (!statsResponse.ok) throw new Error('Failed to fetch stats');
        const statsData = await statsResponse.json();
        setStats(statsData);
        
        toast.success("Dashboard data loaded successfully!");
      } catch (err) {
        setError(err.message);
        toast.error(err.message || "Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []); // The empty array [] means this effect runs once when the component mounts

  // MODIFIED: The filtering logic now works on the fetched 'jobs' state
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    // This filter logic is basic. You might need to enhance the job object
    // with a 'status' field if you want to filter by Applied, Ready, etc.
    // const matchesFilter = filterStatus === 'all' || job.status.toLowerCase() === filterStatus;
    
    return matchesSearch; // && matchesFilter;
  });

  const getStatusColor = (job) => {
    if (job.emailSent) return 'bg-green-100 text-green-800';
    if (job.motivationLetterPath) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };
  
  const getStatusText = (job) => {
    if (job.emailSent) return 'Applied';
    if (job.motivationLetterPath) return 'Ready to Send';
    return 'Pending Letter';
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
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div /* ... (no changes here) ... */ >
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

        {/* MODIFIED: Stats Grid now uses fetched data */}
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
                  <p className="text-2xl font-bold font-display">{stats.totalJobs}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-blue-600"><Search className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-elegant transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Letters Generated</p>
                  <p className="text-2xl font-bold font-display">{stats.jobsWithMotivationLetters}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50 text-green-600"><FileText className="w-5 h-5" /></div>
              </div>
            </CardContent>
          </Card>
          {/* You can add more stat cards here if your API provides more data */}
        </motion.div>

        {/* MODIFIED: Jobs Table now uses fetched data */}
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
                        <TableCell><div className="font-medium">{job.title}</div></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />{job.institution}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />{job.location}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />{job.startDate}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job)}>{getStatusText(job)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm">
                            <a href={job.url} target="_blank" rel="noopener noreferrer">
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