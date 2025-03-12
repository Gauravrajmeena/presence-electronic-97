
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
    
    const { operation, userId, date } = await req.json()
    
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
    
    // Mark absentees for a specific date
    if (operation === 'markAbsentees') {
      const targetDate = date ? new Date(date) : new Date();
      const dateStr = targetDate.toISOString().split('T')[0];
      
      // Get all registered students
      const { data: registeredData, error: registeredError } = await supabaseClient
        .from('attendance_records')
        .select('user_id, device_info')
        .eq('status', 'registered');
      
      if (registeredError) throw registeredError;
      
      // Get students who are already marked present/absent for the day
      const { data: attendanceData, error: attendanceError } = await supabaseClient
        .from('attendance_records')
        .select('user_id')
        .gte('timestamp', `${dateStr}T00:00:00`)
        .lte('timestamp', `${dateStr}T23:59:59`)
        .in('status', ['present', 'late', 'absent']);
      
      if (attendanceError) throw attendanceError;
      
      // Find students who haven't been marked yet
      const presentStudentIds = new Set(attendanceData?.map(record => record.user_id) || []);
      const absenteeRecords = [];
      
      for (const student of registeredData || []) {
        if (!presentStudentIds.has(student.user_id)) {
          // Extract student metadata for notification purposes
          let name = 'Unknown Student';
          if (student.device_info && 
              typeof student.device_info === 'object' && 
              student.device_info.metadata && 
              student.device_info.metadata.name) {
            name = student.device_info.metadata.name;
          }
          
          absenteeRecords.push({
            user_id: student.user_id,
            timestamp: `${dateStr}T23:59:59`,
            status: 'absent',
            device_info: {
              type: 'system',
              timestamp: new Date().toISOString(),
              automatic: true,
              metadata: {
                name
              }
            }
          });
        }
      }
      
      // Insert absence records
      let insertedCount = 0;
      if (absenteeRecords.length > 0) {
        const { data: insertData, error: insertError } = await supabaseClient
          .from('attendance_records')
          .insert(absenteeRecords);
        
        if (insertError) throw insertError;
        insertedCount = absenteeRecords.length;
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          date: dateStr,
          absenteesMarked: insertedCount
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }
    
    // Sample function to get attendance statistics
    if (operation === 'getAttendanceStats') {
      const today = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Get total employees
      const { data: employeesData, error: employeesError } = await supabaseClient
        .from('attendance_records')
        .select('user_id')
        .eq('status', 'registered')
        .is('user_id', 'not.null');
      
      if (employeesError) throw employeesError;
      
      // Get unique user_ids
      const uniqueEmployeeIds = new Set();
      employeesData?.forEach(emp => {
        if (emp.user_id) uniqueEmployeeIds.add(emp.user_id);
      });
      
      const totalEmployees = uniqueEmployeeIds.size;
      
      // Get present employees today
      const { data: presentData, error: presentError } = await supabaseClient
        .from('attendance_records')
        .select('user_id')
        .in('status', ['present'])
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`);
      
      if (presentError) throw presentError;
      
      // Count unique present employees
      const uniquePresentIds = new Set();
      presentData?.forEach(record => {
        if (record.user_id) uniquePresentIds.add(record.user_id);
      });
      
      const presentEmployees = uniquePresentIds.size;
      
      // Get late employees today
      const { data: lateData, error: lateError } = await supabaseClient
        .from('attendance_records')
        .select('user_id')
        .eq('status', 'late')
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`);
      
      if (lateError) throw lateError;
      
      // Count unique late employees
      const uniqueLateIds = new Set();
      lateData?.forEach(record => {
        if (record.user_id) uniqueLateIds.add(record.user_id);
      });
      
      const lateEmployees = uniqueLateIds.size;
      
      // Get absent employees today
      const { data: absentData, error: absentError } = await supabaseClient
        .from('attendance_records')
        .select('user_id')
        .eq('status', 'absent')
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`);
      
      if (absentError) throw absentError;
      
      // Count unique absent employees
      const uniqueAbsentIds = new Set();
      absentData?.forEach(record => {
        if (record.user_id) uniqueAbsentIds.add(record.user_id);
      });
      
      const absentEmployees = uniqueAbsentIds.size;
      
      // Calculate absent employees (if not explicitly marked)
      const calculatedAbsentEmployees = Math.max(
        absentEmployees,
        totalEmployees - presentEmployees - lateEmployees
      );
      
      return new Response(
        JSON.stringify({
          present: presentEmployees,
          late: lateEmployees,
          absent: calculatedAbsentEmployees,
          total: totalEmployees,
          presentPercentage: totalEmployees > 0 ? Math.round((presentEmployees / totalEmployees) * 100) : 0,
          latePercentage: totalEmployees > 0 ? Math.round((lateEmployees / totalEmployees) * 100) : 0,
          absentPercentage: totalEmployees > 0 ? Math.round((calculatedAbsentEmployees / totalEmployees) * 100) : 0,
          date: today
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
