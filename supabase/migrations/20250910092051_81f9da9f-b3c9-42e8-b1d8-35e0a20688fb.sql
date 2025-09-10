-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create jobs table for scraped job data
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  institution TEXT NOT NULL,
  location TEXT,
  start_date DATE,
  description TEXT,
  contact_email TEXT,
  source_url TEXT,
  letter_generated BOOLEAN DEFAULT false,
  letter_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table for user uploaded files
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  is_cv BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email campaigns table for tracking sent emails
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  send_type TEXT NOT NULL CHECK (send_type IN ('all', 'individual')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  total_emails INTEGER DEFAULT 0,
  sent_emails INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create email campaign jobs junction table
CREATE TABLE public.email_campaign_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, job_id)
);

-- Create email campaign documents junction table
CREATE TABLE public.email_campaign_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  UNIQUE(campaign_id, document_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for jobs
CREATE POLICY "Users can view their own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for documents
CREATE POLICY "Users can view their own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.documents
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for email campaigns
CREATE POLICY "Users can view their own email campaigns" ON public.email_campaigns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own email campaigns" ON public.email_campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own email campaigns" ON public.email_campaigns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own email campaigns" ON public.email_campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for email campaign jobs
CREATE POLICY "Users can view their email campaign jobs" ON public.email_campaign_jobs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.email_campaigns ec 
    WHERE ec.id = email_campaign_jobs.campaign_id AND ec.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert their email campaign jobs" ON public.email_campaign_jobs
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_campaigns ec 
    WHERE ec.id = email_campaign_jobs.campaign_id AND ec.user_id = auth.uid()
  ));
CREATE POLICY "Users can update their email campaign jobs" ON public.email_campaign_jobs
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.email_campaigns ec 
    WHERE ec.id = email_campaign_jobs.campaign_id AND ec.user_id = auth.uid()
  ));

-- Create RLS policies for email campaign documents
CREATE POLICY "Users can view their email campaign documents" ON public.email_campaign_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.email_campaigns ec 
    WHERE ec.id = email_campaign_documents.campaign_id AND ec.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert their email campaign documents" ON public.email_campaign_documents
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.email_campaigns ec 
    WHERE ec.id = email_campaign_documents.campaign_id AND ec.user_id = auth.uid()
  ));
CREATE POLICY "Users can delete their email campaign documents" ON public.email_campaign_documents
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.email_campaigns ec 
    WHERE ec.id = email_campaign_documents.campaign_id AND ec.user_id = auth.uid()
  ));

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('motivation-letters', 'motivation-letters', false);

-- Create storage policies for documents
CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own documents" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for motivation letters
CREATE POLICY "Users can view their own motivation letters" ON storage.objects
  FOR SELECT USING (bucket_id = 'motivation-letters' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own motivation letters" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'motivation-letters' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own motivation letters" ON storage.objects
  FOR UPDATE USING (bucket_id = 'motivation-letters' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own motivation letters" ON storage.objects
  FOR DELETE USING (bucket_id = 'motivation-letters' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();