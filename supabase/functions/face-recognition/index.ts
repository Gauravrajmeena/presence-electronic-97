
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    
    const { operation, userId } = await req.json()
    
    // Health check endpoint for model status
    if (operation === 'healthCheck') {
      return new Response(
        JSON.stringify({
          status: 'ok',
          message: 'Face recognition service is running',
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    // Track attendance count for a specific user
    if (operation === 'getUserAttendanceCount' && userId) {
      // Get attendance count for the specific user
      const { data: attendanceData, error: attendanceError } = await supabaseClient
        .from('attendance_records')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'present');
      
      if (attendanceError) throw attendanceError;
      
      return new Response(
        JSON.stringify({
          count: attendanceData?.length || 0,
          userId: userId
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    // Sample function to get attendance statistics
    if (operation === 'getAttendanceStats') {
      const today = new Date().toISOString().split('T')[0]
      
      // Get total employees
      const { data: employeesData, error: employeesError } = await supabaseClient
        .from('employees')
        .select('id')
      
      if (employeesError) throw employeesError
      
      const totalEmployees = employeesData?.length || 0
      
      // Get present employees today
      const { data: presentData, error: presentError } = await supabaseClient
        .from('attendance_dates')
        .select('id')
        .eq('date', today)
      
      if (presentError) throw presentError
      
      const presentEmployees = presentData?.length || 0
      
      // Get late employees today
      const { data: lateData, error: lateError } = await supabaseClient
        .from('attendance_records')
        .select('id')
        .eq('status', 'late')
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`)
      
      if (lateError) throw lateError
      
      const lateEmployees = lateData?.length || 0
      
      // Calculate absent employees
      const absentEmployees = Math.max(0, totalEmployees - presentEmployees)
      
      return new Response(
        JSON.stringify({
          present: presentEmployees,
          late: lateEmployees,
          absent: absentEmployees,
          total: totalEmployees,
          presentPercentage: totalEmployees > 0 ? Math.round((presentEmployees / totalEmployees) * 100) : 0,
          latePercentage: totalEmployees > 0 ? Math.round((lateEmployees / totalEmployees) * 100) : 0,
          absentPercentage: totalEmployees > 0 ? Math.round((absentEmployees / totalEmployees) * 100) : 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    // Handler for future operations
    
    return new Response(
      JSON.stringify({ error: 'Unknown operation' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  } catch (error) {
    console.error('Face recognition function error:', error);
    
    return new Response(
      JSON.stringify({ 
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
