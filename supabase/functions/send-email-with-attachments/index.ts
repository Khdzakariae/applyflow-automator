import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
    const { campaignId, jobIds, documentIds } = await req.json();

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

    // Get user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get user profile
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.full_name || user.user_metadata?.full_name || 'Job Seeker';
    const userEmail = profile?.email || user.email;

    // Get jobs to send emails for
    const { data: jobs, error: jobsError } = await supabaseClient
      .from('jobs')
      .select('*')
      .in('id', jobIds)
      .eq('user_id', user.id);

    if (jobsError || !jobs?.length) {
      throw new Error('No jobs found for email sending');
    }

    // Get documents to attach
    const documents = [];
    if (documentIds?.length > 0) {
      const { data: docData, error: docError } = await supabaseClient
        .from('documents')
        .select('*')
        .in('id', documentIds)
        .eq('user_id', user.id);

      if (docError) {
        console.error('Error fetching documents:', docError);
      } else if (docData) {
        documents.push(...docData);
      }
    }

    let sentCount = 0;
    const errors = [];

    // Send email for each job
    for (const job of jobs) {
      try {
        if (!job.contact_email) {
          console.log(`Skipping job ${job.id} - no contact email`);
          continue;
        }

        // Prepare attachments
        const attachments = [];

        // Add CV if available
        const cvDocument = documents.find(doc => doc.is_cv);
        if (cvDocument) {
          try {
            const { data: cvData } = await supabaseClient.storage
              .from('documents')
              .download(cvDocument.file_path);
            
            if (cvData) {
              const cvBuffer = await cvData.arrayBuffer();
              attachments.push({
                filename: cvDocument.name,
                content: Array.from(new Uint8Array(cvBuffer))
              });
            }
          } catch (error) {
            console.error('Error downloading CV:', error);
          }
        }

        // Add cover letter if available
        if (job.letter_path) {
          try {
            const { data: letterData } = await supabaseClient.storage
              .from('motivation-letters')
              .download(job.letter_path);
            
            if (letterData) {
              const letterBuffer = await letterData.arrayBuffer();
              attachments.push({
                filename: `Cover_Letter_${job.institution.replace(/[^a-zA-Z0-9]/g, '_')}.txt`,
                content: Array.from(new Uint8Array(letterBuffer))
              });
            }
          } catch (error) {
            console.error('Error downloading cover letter:', error);
          }
        }

        // Add other selected documents
        for (const doc of documents.filter(d => !d.is_cv)) {
          try {
            const { data: docData } = await supabaseClient.storage
              .from('documents')
              .download(doc.file_path);
            
            if (docData) {
              const docBuffer = await docData.arrayBuffer();
              attachments.push({
                filename: doc.name,
                content: Array.from(new Uint8Array(docBuffer))
              });
            }
          } catch (error) {
            console.error(`Error downloading document ${doc.name}:`, error);
          }
        }

        // Send email
        const emailSubject = `Application for ${job.title} Position`;
        const emailContent = `
Dear Hiring Manager,

I am writing to apply for the ${job.title} position at ${job.institution}.

Please find attached my CV${job.letter_path ? ' and cover letter' : ''}${attachments.length > 2 ? ' along with additional documents' : ''} for your review.

I am very interested in this opportunity and would welcome the chance to discuss my qualifications with you.

Thank you for your consideration.

Best regards,
${userName}
${userEmail}
        `.trim();

        const emailResponse = await resend.emails.send({
          from: `${userName} <onboarding@resend.dev>`,
          to: [job.contact_email],
          subject: emailSubject,
          text: emailContent,
          attachments: attachments
        });

        if (emailResponse.error) {
          throw new Error(emailResponse.error.message);
        }

        // Update campaign job status
        await supabaseClient
          .from('email_campaign_jobs')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('campaign_id', campaignId)
          .eq('job_id', job.id);

        sentCount++;
        console.log(`Email sent successfully for job ${job.id} to ${job.contact_email}`);

      } catch (jobError) {
        console.error(`Error sending email for job ${job.id}:`, jobError);
        errors.push({
          jobId: job.id,
          error: jobError.message
        });

        // Update status as failed
        await supabaseClient
          .from('email_campaign_jobs')
          .update({
            status: 'failed'
          })
          .eq('campaign_id', campaignId)
          .eq('job_id', job.id);
      }
    }

    // Update campaign status
    await supabaseClient
      .from('email_campaigns')
      .update({
        sent_emails: sentCount,
        status: sentCount === jobs.length ? 'completed' : 'partially_completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', campaignId);

    return new Response(JSON.stringify({
      success: true,
      sentCount,
      totalJobs: jobs.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-email-with-attachments function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});