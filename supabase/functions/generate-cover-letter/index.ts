import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Set auth token for the client
    supabaseClient.auth.setSession({
      access_token: authHeader.replace('Bearer ', ''),
      refresh_token: ''
    });

    // Get user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch job details
    const { data: job, error: jobError } = await supabaseClient
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found or not accessible');
    }

    // Fetch user profile for personalization
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Fetch user CV data
    const { data: cvDocument } = await supabaseClient
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_cv', true)
      .single();

    const userName = profile?.full_name || user.user_metadata?.full_name || 'Job Seeker';
    const userEmail = profile?.email || user.email || '';

    // Extract CV content if available
    let cvContent = '';
    if (cvDocument) {
      try {
        const { data: cvFile } = await supabaseClient.storage
          .from('documents')
          .download(cvDocument.file_path);
        
        if (cvFile) {
          // For simplicity, we'll use the CV metadata for now
          // In a real implementation, you'd parse PDF/DOC content
          cvContent = `CV: ${cvDocument.name} (uploaded ${new Date(cvDocument.created_at).toLocaleDateString()})`;
        }
      } catch (error) {
        console.error('Error downloading CV:', error);
      }
    }

    // Generate personalized cover letter using Gemini AI
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const prompt = `Generate a professional cover letter in French (lettre de motivation) for the following job application:

Job Details:
- Title: ${job.title}
- Institution: ${job.institution}
- Location: ${job.location || 'Non spécifié'}
- Description: ${job.description || 'Non fournie'}
- Start Date: ${job.start_date || 'Non spécifiée'}

Applicant Details:
- Name: ${userName}
- Email: ${userEmail}
${cvContent ? `- CV Information: ${cvContent}` : ''}

Requirements:
- Write in professional French
- Personalize based on the job and user information
- Keep it concise but compelling (200-300 words)
- Include relevant skills and motivation
- End with appropriate French closing

Format the response as a complete letter with proper greeting and signature.`;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    const coverLetterContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed to generate content';

    // Generate PDF
    const doc = new jsPDF();
    
    // Set font and add title
    doc.setFontSize(16);
    doc.text('Lettre de Motivation', 20, 20);
    
    // Add date
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString('fr-FR'), 20, 35);
    
    // Add content with proper line wrapping
    doc.setFontSize(11);
    const splitText = doc.splitTextToSize(coverLetterContent, 170);
    doc.text(splitText, 20, 50);
    
    // Convert PDF to blob
    const pdfBlob = doc.output('blob');

    // Create filename
    const fileName = `Lettre_motivation_${job.institution.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    const filePath = `${user.id}/${fileName}`;

    // Upload PDF cover letter to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('motivation-letters')
      .upload(filePath, pdfBlob, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      throw new Error(`Failed to upload cover letter: ${uploadError.message}`);
    }

    // Update job record with cover letter path
    const { error: updateError } = await supabaseClient
      .from('jobs')
      .update({
        letter_path: filePath,
        letter_generated: true
      })
      .eq('id', jobId)
      .eq('user_id', user.id);

    if (updateError) {
      throw new Error(`Failed to update job record: ${updateError.message}`);
    }

    console.log(`Cover letter generated for job ${jobId} and saved to ${filePath}`);

    return new Response(JSON.stringify({ 
      success: true, 
      letterPath: filePath,
      message: 'Cover letter generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-cover-letter function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});