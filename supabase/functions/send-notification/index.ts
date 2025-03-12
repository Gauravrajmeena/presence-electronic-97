
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )
    
    const payload = await req.json()
    const { subject, message, recipient, studentName, date } = payload
    
    // Log notification attempt
    await supabaseClient
      .from('notification_logs')
      .insert({
        recipient: recipient,
        subject: subject,
        message: message,
        status: 'processing',
        student_name: studentName,
        notification_date: date
      })
    
    let emailSent = false
    let smsSent = false
    
    // Send email if email address is provided
    if (recipient.email) {
      try {
        const client = new SmtpClient()
        await client.connectTLS({
          hostname: Deno.env.get('SMTP_HOST') || '',
          port: Number(Deno.env.get('SMTP_PORT')) || 587,
          username: Deno.env.get('SMTP_USERNAME') || '',
          password: Deno.env.get('SMTP_PASSWORD') || '',
        })
        
        await client.send({
          from: Deno.env.get('SMTP_FROM') || 'noreply@school.edu',
          to: recipient.email,
          subject: subject,
          content: message,
        })
        
        await client.close()
        emailSent = true
        
        // Update log with email success
        await supabaseClient
          .from('notification_logs')
          .update({ email_status: 'sent' })
          .eq('recipient', recipient)
          .eq('subject', subject)
      } catch (error) {
        console.error('Email sending error:', error)
        // Update log with email failure
        await supabaseClient
          .from('notification_logs')
          .update({ email_status: 'failed', error_details: error.toString() })
          .eq('recipient', recipient)
          .eq('subject', subject)
      }
    }
    
    // Mock SMS sending (in a real app, you would integrate with Twilio or similar)
    if (recipient.phone) {
      try {
        // In a production app, you would send SMS via Twilio or another SMS service here
        console.log(`Sending SMS to ${recipient.phone}: ${message}`)
        smsSent = true
        
        // Update log with SMS success
        await supabaseClient
          .from('notification_logs')
          .update({ sms_status: 'sent' })
          .eq('recipient', recipient)
          .eq('subject', subject)
      } catch (error) {
        console.error('SMS sending error:', error)
        // Update log with SMS failure
        await supabaseClient
          .from('notification_logs')
          .update({ sms_status: 'failed', error_details: error.toString() })
          .eq('recipient', recipient)
          .eq('subject', subject)
      }
    }
    
    // Update final notification status
    await supabaseClient
      .from('notification_logs')
      .update({
        status: (emailSent || smsSent) ? 'sent' : 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('recipient', recipient)
      .eq('subject', subject)
    
    return new Response(
      JSON.stringify({
        success: true,
        email_sent: emailSent,
        sms_sent: smsSent,
        message: 'Notification processed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Notification function error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
