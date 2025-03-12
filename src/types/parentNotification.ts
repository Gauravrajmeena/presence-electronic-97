
import { Json } from '@/integrations/supabase/types';

// Parent contact interface 
export interface ParentContact {
  id: string;
  student_id: string;
  name: string;
  email: string;
  phone: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
  };
}

// Notification log interface
export interface NotificationLog {
  id: string;
  student_name: string;
  recipient: {
    email?: string;
    phone?: string;
  };
  subject: string;
  message: string;
  status: string;
  notification_date: string;
  completed_at?: string;
  email_status?: string;
  sms_status?: string;
  error_details?: string;
}

// Helper function to safely parse notification preferences
export function parseNotificationPreferences(preferences: unknown): { email: boolean; sms: boolean } {
  if (!preferences) {
    return { email: false, sms: false };
  }
  
  try {
    if (typeof preferences === 'string') {
      return JSON.parse(preferences);
    } else if (typeof preferences === 'object') {
      const prefs = preferences as any;
      return {
        email: Boolean(prefs.email),
        sms: Boolean(prefs.sms)
      };
    }
  } catch (e) {
    console.error('Error parsing notification preferences:', e);
  }
  
  return { email: false, sms: false };
}
