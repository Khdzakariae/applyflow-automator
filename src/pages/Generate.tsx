import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Bot, 
  CheckCircle,
  ArrowLeft,
  Wand2,
  FileCheck,
  X,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Generate = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [lettersGenerated, setLettersGenerated] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      toast.success('CV uploaded successfully');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Please select a PDF file');
        return;
      }
      setSelectedFile(file);
      toast.success('CV uploaded successfully');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      toast.error('Please upload your CV first');
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGenerationComplete(false);

    // Simulate generation process
    const totalJobs = 15; // Mock number of jobs
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + (100 / totalJobs);
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          setGenerationComplete(true);
          setLettersGenerated(totalJobs);
          toast.success('All motivation letters generated successfully!');
          return 100;
        }
        return newProgress;
      });
    }, 200);
  };

  const handleReset = () => {
    setProgress(0);
    setGenerationComplete(false);
    setLettersGenerated(0);
  };

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
                <Bot className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-display font-bold mb-2">Generate Motivation Letters</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Upload your CV and let AI create personalized motivation letters for all your scraped job opportunities.
            </p>
          </div>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* File Upload Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-xl font-display flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary" />
                  Upload Your CV
                </CardTitle>
                <CardDescription>
                  Upload your CV in PDF format. This will be used to generate personalized motivation letters.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedFile ? (
                  <div
                    className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Upload your CV</h3>
                    <p className="text-muted-foreground mb-4">
                      Drag and drop your PDF file here, or click to browse
                    </p>
                    <Button variant="outline">
                      Browse Files
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      PDF files only, max 5MB
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-10 h-10 text-primary" />
                      <div>
                        <h4 className="font-medium">{selectedFile.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={removeFile}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Generation Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle className="text-xl font-display flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-primary" />
                  AI Letter Generation
                </CardTitle>
                <CardDescription>
                  Generate personalized motivation letters for all your scraped job opportunities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium mb-2">
                    <FileCheck className="w-4 h-4 text-primary" />
                    Jobs Ready for Letter Generation
                  </div>
                  <p className="text-2xl font-bold font-display text-primary">15 Jobs</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Found from your previous scraping sessions
                  </p>
                </div>

                {isGenerating && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 p-4 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <LoadingSpinner size="sm" />
                      Generating motivation letters...
                    </div>
                    <Progress value={progress} className="w-full" />
                    <p className="text-xs text-muted-foreground">
                      Processing job {Math.ceil((progress / 100) * 15)} of 15... ({Math.round(progress)}% complete)
                    </p>
                  </motion.div>
                )}

                {generationComplete && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                  >
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-medium mb-2">
                      <CheckCircle className="w-5 h-5" />
                      Generation Complete!
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                      Successfully generated {lettersGenerated} personalized motivation letters
                    </p>
                    <div className="flex gap-2">
                      <Button asChild size="sm">
                        <Link to="/send-emails">
                          Send Applications
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/dashboard">
                          View Dashboard
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleReset}>
                        Generate More
                      </Button>
                    </div>
                  </motion.div>
                )}

                <Button
                  onClick={handleGenerate}
                  className="w-full hero-button"
                  disabled={!selectedFile || isGenerating || generationComplete}
                >
                  {isGenerating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Generating Letters...
                    </>
                  ) : generationComplete ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Generation Complete
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate All Motivation Letters
                    </>
                  )}
                </Button>

                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Bot className="w-5 h-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <h4 className="font-medium mb-1">How it works</h4>
                      <p className="text-muted-foreground">
                        Our AI analyzes each job posting and your CV to create tailored motivation letters. 
                        Each letter highlights relevant experience and matches the job requirements perfectly.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Generate;