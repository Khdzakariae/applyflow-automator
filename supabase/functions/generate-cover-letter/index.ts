import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

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

    const userName = profile?.full_name || user.user_metadata?.full_name || 'Job Seeker';

    // Generate cover letter content
    const coverLetterContent = `Dear Hiring Manager,

I am writing to express my strong interest in the ${job.title} position at ${job.institution}. With my background and passion for healthcare and professional development, I am excited about the opportunity to contribute to your team.

Your organization's commitment to excellence in ${job.location ? `the ${job.location} area` : 'healthcare'} aligns perfectly with my career goals and values. I am particularly drawn to this role because it offers the chance to make a meaningful impact while continuing to grow professionally.

I believe my skills and enthusiasm make me an ideal candidate for this position. I am eager to bring my dedication and fresh perspective to ${job.institution} and contribute to your team's continued success.

I would welcome the opportunity to discuss how my background and enthusiasm can benefit your organization. Thank you for considering my application. I look forward to hearing from you.

Sincerely,
${userName}`;

    // Create filename
    const fileName = `cover_letter_${job.institution.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.txt`;
    const filePath = `${user.id}/${fileName}`;

    // Upload cover letter to storage
    const { error: uploadError } = await supabaseClient.storage
      .from('motivation-letters')
      .upload(filePath, new Blob([coverLetterContent], { type: 'text/plain' }));

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