
import { supabase } from '@/integrations/supabase/client';

interface ParentContact {
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

interface NotificationPayload {
  subject: string;
  message: string;
  recipient: {
    email?: string;
    phone?: string;
  };
  studentName: string;
  date: string;
}

export async function sendAbsenceNotification(
  studentId: string,
  studentName: string,
  date: string
): Promise<boolean> {
  try {
    console.log(`Preparing to send absence notification for student ${studentName} (${studentId})`);
    
    // Fetch parent contact information from database with type assertion
    const { data: contactData, error: contactError } = await supabase
      .from('parent_contacts' as any)
      .select('*')
      .eq('student_id', studentId)
      .single();
    
    if (contactError || !contactData) {
      console.error('Error fetching parent contact:', contactError || 'No contact found');
      return false;
    }
    
    const parentContact = contactData as unknown as ParentContact;
    
    // Prepare notification payload
    const payload: NotificationPayload = {
      subject: 'Attendance Alert: Student Absence',
      message: `Dear ${parentContact.name}, this is an automated notification from the school attendance system. Your child, ${studentName}, has been marked absent today (${date}). If this is unexpected, please contact the school office.`,
      recipient: {
        email: parentContact.notification_preferences.email ? parentContact.email : undefined,
        phone: parentContact.notification_preferences.sms ? parentContact.phone : undefined
      },
      studentName,
      date
    };
    
    // Send notification via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: payload
    });
    
    if (error) {
      console.error('Error sending notification:', error);
      return false;
    }
    
    console.log('Notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in sendAbsenceNotification:', error);
    return false;
  }
}

// Utility function to send a test notification
export async function sendTestNotification(parentContact: ParentContact): Promise<boolean> {
  try {
    const payload: NotificationPayload = {
      subject: 'Test Notification',
      message: `This is a test notification from the school attendance system.`,
      recipient: {
        email: parentContact.notification_preferences.email ? parentContact.email : undefined,
        phone: parentContact.notification_preferences.sms ? parentContact.phone : undefined
      },
      studentName: 'Test Student',
      date: new Date().toLocaleDateString()
    };
    
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: payload
    });
    
    if (error) {
      console.error('Error sending test notification:', error);
      return false;
    }
    
    console.log('Test notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in sendTestNotification:', error);
    return false;
  }
}
