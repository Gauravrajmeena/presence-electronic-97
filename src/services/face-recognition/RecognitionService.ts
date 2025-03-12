import { supabase } from '@/integrations/supabase/client';
import { descriptorToString, stringToDescriptor } from './ModelService';
import { sendAbsenceNotification } from '../notification/NotificationService';

interface Employee {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  position: string;
  firebase_image_url: string;
}

interface RecognitionResult {
  recognized: boolean;
  employee?: Employee;
  confidence?: number;
}

interface DeviceInfo {
  metadata?: {
    name?: string;
    employee_id?: string;
    department?: string;
    position?: string;
    firebase_image_url?: string;
    faceDescriptor?: string;
  };
  type?: string;
  timestamp?: string;
  registration?: boolean;
  firebase_image_url?: string;
}

export async function recognizeFace(faceDescriptor: Float32Array): Promise<RecognitionResult> {
  try {
    console.log('Starting face recognition process');
    
    const faceDescriptorString = descriptorToString(faceDescriptor);
    
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('status', 'registered');
    
    if (error) {
      console.error('Error querying attendance records:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.log('No registered faces found in the database');
      return { recognized: false };
    }
    
    console.log(`Found ${data.length} registered faces to compare against`);
    
    let bestMatch: any = null;
    let bestDistance = 0.6;
    
    for (const record of data) {
      try {
        const deviceInfo = record.device_info as DeviceInfo | null;
        
        if (
          deviceInfo?.metadata?.faceDescriptor &&
          typeof deviceInfo.metadata.faceDescriptor === 'string'
        ) {
          const registeredDescriptor = stringToDescriptor(deviceInfo.metadata.faceDescriptor);
          const distance = calculateDistance(faceDescriptor, registeredDescriptor);
          
          const personName = deviceInfo.metadata.name || 'unknown';
          console.log(`Face comparison: distance = ${distance.toFixed(4)} for ${personName}`);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = record;
          }
        }
      } catch (e) {
        console.error('Error processing record:', e);
      }
    }
    
    if (bestMatch) {
      console.log(`Best match found with confidence: ${((1 - bestDistance) * 100).toFixed(2)}%`);
      
      const deviceInfo = bestMatch.device_info as DeviceInfo | null;
      const employeeData = deviceInfo?.metadata;
      
      if (!employeeData) {
        console.error('Employee metadata missing from best match');
        return { recognized: false };
      }
      
      const employee: Employee = {
        id: bestMatch.user_id || 'unknown',
        name: employeeData.name || 'Unknown',
        employee_id: employeeData.employee_id || 'Unknown',
        department: employeeData.department || 'Unknown',
        position: employeeData.position || 'Unknown',
        firebase_image_url: employeeData.firebase_image_url || '',
      };
      
      return {
        recognized: true,
        employee,
        confidence: 1 - bestDistance
      };
    }
    
    console.log('No face match found above confidence threshold');
    return { recognized: false };
  } catch (error) {
    console.error('Face recognition error:', error);
    throw error;
  }
}

function calculateDistance(descriptor1: Float32Array, descriptor2: Float32Array): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Face descriptors have different dimensions');
  }
  
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  
  return Math.sqrt(sum);
}

export const recordAttendance = async (
  userId: string,
  status: 'present' | 'unauthorized',
  confidenceScore: number = 0
): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: existingRecord, error: checkError } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', userId)
      .eq('status', status)
      .gte('timestamp', `${today}T00:00:00`)
      .lte('timestamp', `${today}T23:59:59`)
      .maybeSingle();
      
    if (checkError) {
      throw new Error(`Error checking existing attendance: ${checkError.message}`);
    }
    
    if (existingRecord) {
      console.log(`Attendance already recorded for user ${userId} today with status ${status}`);
      return true;
    }
    
    const deviceInfo = {
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      confidenceScore: confidenceScore,
    };
    
    const { error: insertError } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        status,
        confidence_score: confidenceScore,
        device_info: deviceInfo
      });
      
    if (insertError) {
      throw new Error(`Error recording attendance: ${insertError.message}`);
    }
    
    if (status === 'present') {
      const { data: userData, error: userError } = await supabase
        .from('attendance_records')
        .select('device_info')
        .eq('user_id', userId)
        .contains('device_info', { registration: true })
        .maybeSingle();
        
      if (!userError && userData) {
        const deviceInfo = userData.device_info as any;
        const metadata = deviceInfo?.metadata || {};
        const studentName = metadata.name || 'Unknown Student';
        
        const now = new Date();
        const hour = now.getHours();
        const minutes = now.getMinutes();
        
        const isLate = hour > 9 || (hour === 9 && minutes > 30);
        
        if (isLate) {
          console.log(`Late arrival recorded for ${studentName}`);
          
          try {
            await sendAbsenceNotification(userId, studentName, new Date());
          } catch (notifyError) {
            console.error('Error sending late arrival notification:', notifyError);
          }
        }
      }
    }
    
    console.log(`Attendance recorded successfully for user ${userId} with status ${status}`);
    return true;
  } catch (error) {
    console.error('Error recording attendance:', error);
    return false;
  }
};
