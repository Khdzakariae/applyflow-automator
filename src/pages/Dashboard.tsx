import React, { useState } from 'react';
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
  Filter, 
  Download, 
  ExternalLink,
  MapPin,
  Calendar,
  Building2,
  Mail,
  FileText,
  Plus,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';

// Mock data
const mockJobs = [
  {
    id: '1',
    title: 'Pflegefachmann/frau',
    institution: 'Universitätsklinikum München',
    location: 'München, Bayern',
    startDate: '2024-03-01',
    letterGenerated: true,
    emailSent: true,
    appliedDate: '2024-01-15',
    status: 'Applied'
  },
  {
    id: '2',
    title: 'Gesundheits- und Krankenpfleger',
    institution: 'Charité Berlin',
    location: 'Berlin, Deutschland',
    startDate: '2024-04-01',
    letterGenerated: true,
    emailSent: false,
    appliedDate: null,
    status: 'Ready'
  },
  {
    id: '3',
    title: 'Altenpfleger (m/w/d)',
    institution: 'Pflegeheim Sonnenschein',
    location: 'Hamburg, Deutschland',
    startDate: '2024-02-15',
    letterGenerated: false,
    emailSent: false,
    appliedDate: null,
    status: 'Pending'
  },
  {
    id: '4',
    title: 'Pflegefachkraft Intensivstation',
    institution: 'Klinikum Stuttgart',
    location: 'Stuttgart, Baden-Württemberg',
    startDate: '2024-05-01',
    letterGenerated: true,
    emailSent: true,
    appliedDate: '2024-01-20',
    status: 'Applied'
  },
  {
    id: '5',
    title: 'Kinderkrankenpfleger/in',
    institution: 'Kinderkrankenhaus Frankfurt',
    location: 'Frankfurt, Hessen',
    startDate: '2024-03-15',
    letterGenerated: false,
    emailSent: false,
    appliedDate: null,
    status: 'Pending'
  },
];

const stats = [
  { label: 'Total Jobs Found', value: '47', icon: Search, color: 'text-blue-600' },
  { label: 'Letters Generated', value: '28', icon: FileText, color: 'text-green-600' },
  { label: 'Applications Sent', value: '15', icon: Mail, color: 'text-purple-600' },
  { label: 'Success Rate', value: '87%', icon: TrendingUp, color: 'text-emerald-600' },
];

const Dashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || job.status.toLowerCase() === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'applied': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'ready': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

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
          {stats.map((stat, index) => (
            <Card key={index} className="hover:shadow-elegant transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold font-display">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="applied">Applied</option>
                    <option value="ready">Ready</option>
                    <option value="pending">Pending</option>
                  </select>
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
                      <TableHead>Letter Status</TableHead>
                      <TableHead>Email Status</TableHead>
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
                            {new Date(job.startDate).toLocaleDateString('de-DE')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.letterGenerated ? 'default' : 'secondary'}>
                            {job.letterGenerated ? 'Generated' : 'Not Generated'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={job.emailSent ? 'default' : 'secondary'}>
                            {job.emailSent ? 'Sent' : 'Not Sent'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(job.status)}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {filteredJobs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No jobs found matching your criteria.</p>
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