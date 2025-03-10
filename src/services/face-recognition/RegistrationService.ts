
import { supabase } from '@/integrations/supabase/client';
import { uploadImage } from './StorageService';
import { v4 as uuidv4 } from 'uuid';
import { descriptorToString } from './ModelService';

// Define an interface for the metadata to ensure type safety
export interface RegistrationMetadata {
  name: string;
  employee_id: string;
  department: string;
  position: string;
  firebase_image_url: string;
  faceDescriptor?: string; // Make this optional since it's added conditionally
}

export const registerFace = async (
  imageBlob: Blob,
  name: string,
  employee_id: string,
  department: string,
  position: string,
  userId: string | undefined,
  faceDescriptor?: Float32Array
): Promise<any> => {
  try {
    console.log('Starting face registration process', {
      name,
      employee_id,
      department,
      position,
      hasDescriptor: !!faceDescriptor
    });
    
    // Upload face image to storage
    const imageUrl = await uploadFaceImage(imageBlob);
    console.log('Face image uploaded successfully:', imageUrl);
    
    // Prepare metadata as a plain object that conforms to Json type
    const metadata: Record<string, any> = {
      name,
      employee_id,
      department,
      position,
      firebase_image_url: imageUrl
    };

    // If we have a face descriptor, store it as well
    if (faceDescriptor) {
      metadata.faceDescriptor = descriptorToString(faceDescriptor);
    }
    
    // Create device info as a plain object that conforms to Json type
    const deviceInfo: Record<string, any> = {
      type: 'webcam',
      registration: true,
      metadata: metadata,
      timestamp: new Date().toISOString()
    };

    console.log('Inserting attendance record with metadata');
    
    // Insert registration record
    const { data: recordData, error: recordError } = await supabase
      .from('attendance_records')
      .insert({
        user_id: userId,
        timestamp: new Date().toISOString(),
        status: 'registered',
        device_info: deviceInfo,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error inserting attendance record:', recordError);
      throw new Error(`Error inserting attendance record: ${recordError.message}`);
    }

    console.log('Registration completed successfully:', recordData);
    return recordData;
  } catch (error: any) {
    console.error('Face registration failed:', error);
    throw error;
  }
};

export const uploadFaceImage = async (imageBlob: Blob): Promise<string> => {
  try {
    console.log('Starting face image upload, blob size:', imageBlob.size);
    
    // Validate the blob
    if (!imageBlob || imageBlob.size === 0) {
      throw new Error('Invalid image: The image blob is empty or invalid');
    }
    
    // Create a unique filename
    const file = new File([imageBlob], `face_${uuidv4()}.jpg`, { type: 'image/jpeg' });
    const filePath = `faces/${uuidv4()}.jpg`;
    
    console.log('Uploading image as:', filePath);
    
    // Use our storage service upload function
    const publicUrl = await uploadImage(file, filePath);
    console.log('Image uploaded successfully:', publicUrl);
    return publicUrl;
  } catch (error) {
    console.error('Error uploading face image:', error);
    throw error;
  }
};

// Add the missing storeUnrecognizedFace function
export const storeUnrecognizedFace = async (imageData: string): Promise<void> => {
  try {
    console.log('Storing unrecognized face');
    
    // Convert base64 image data to a Blob
    const response = await fetch(imageData);
    const blob = await response.blob();
    
    if (!blob || blob.size === 0) {
      console.error('Failed to convert image data to blob');
      return;
    }
    
    // Upload the image
    const imageUrl = await uploadFaceImage(blob);
    
    // Create a device info object with the current timestamp as a plain object
    const deviceInfo: Record<string, any> = {
      type: 'webcam',
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      firebase_image_url: imageUrl,
    };
    
    // Insert a record with status "unauthorized"
    const { error } = await supabase
      .from('attendance_records')
      .insert({
        user_id: null, // No user associated
        status: 'unauthorized',
        device_info: deviceInfo,
        image_url: imageUrl,
      });
    
    if (error) {
      console.error('Error storing unrecognized face:', error);
    } else {
      console.log('Unrecognized face stored successfully');
    }
  } catch (error) {
    console.error('Failed to store unrecognized face:', error);
  }
};
