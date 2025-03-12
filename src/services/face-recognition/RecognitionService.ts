
import { supabase } from '@/integrations/supabase/client';
import { descriptorToString, stringToDescriptor } from './ModelService';

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

// Fixed interface for DeviceInfo properly defining the structure
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
  firebase_image_url?: string; // For the unrecognized face case
}

export async function recognizeFace(faceDescriptor: Float32Array): Promise<RecognitionResult> {
  try {
    console.log('Starting face recognition process');
    
    // Convert the descriptor to a string for comparison
    const faceDescriptorString = descriptorToString(faceDescriptor);
    
    // Query registered faces from attendance_records
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
    let bestDistance = 0.6; // Threshold distance (lower is better)
    
    // Compare the face descriptor against all registered faces
    for (const record of data) {
      try {
        // Type check and safely access properties
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
        // Continue with the next record
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

// Calculate Euclidean distance between two face descriptors
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

export async function recordAttendance(
  userId: string,
  status: 'present' | 'late' | 'absent',
  confidence?: number
): Promise<any> {
  try {
    console.log(`Recording attendance for user ${userId} with status ${status}`);
    
    const timestamp = new Date().toISOString();
    const deviceInfo = {
      type: 'webcam',
      timestamp,
      confidence
    };
    
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        timestamp,
        status,
        device_info: deviceInfo,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error recording attendance:', error);
      throw new Error(`Failed to record attendance: ${error.message}`);
    }
    
    console.log('Attendance recorded successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in recordAttendance:', error);
    throw error;
  }
}
