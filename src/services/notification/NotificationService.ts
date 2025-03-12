
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Interface for parent contact information
 */
export interface ParentContact {
  id: string;
  student_id: string;
  parent_name: string;
  email?: string;
  phone?: string;
  notification_preference: 'email' | 'sms' | 'both' | 'none';
}

/**
 * Send absence notification to parent
 */
export const sendAbsenceNotification = async (
  studentId: string,
  studentName: string,
  date: Date
): Promise<boolean> => {
  try {
    console.log(`Sending absence notification for student ${studentName} (${studentId})`);
    
    // Fetch parent contact information
    const { data: contactData, error: contactError } = await supabase
      .from('parent_contacts')
      .select('*')
      .eq('student_id', studentId)
      .single();
    
    if (contactError || !contactData) {
      console.error('No parent contact information found:', contactError);
      return false;
    }
    
    const parentContact = contactData as ParentContact;
    
    // Format the date for the notification
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Build notification message
    const message = `Attendance Alert: ${studentName} was marked absent on ${formattedDate}. Please contact the school for more information.`;
    
    // Determine which notification method to use based on preference
    if (parentContact.notification_preference === 'email' || parentContact.notification_preference === 'both') {
      if (parentContact.email) {
        await sendEmailNotification(parentContact.email, 'Student Absence Notification', message);
      }
    }
    
    if (parentContact.notification_preference === 'sms' || parentContact.notification_preference === 'both') {
      if (parentContact.phone) {
        await sendSmsNotification(parentContact.phone, message);
      }
    }
    
    // Store notification record in database
    const { error: recordError } = await supabase
      .from('notification_logs')
      .insert({
        parent_contact_id: parentContact.id,
        student_id: studentId,
        notification_type: 'absence',
        message: message,
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    
    if (recordError) {
      console.error('Error recording notification:', recordError);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending absence notification:', error);
    return false;
  }
};

/**
 * Send email notification
 */
const sendEmailNotification = async (email: string, subject: string, message: string): Promise<boolean> => {
  try {
    // Call Supabase Edge Function for sending email
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'email',
        recipient: email,
        subject: subject,
        message: message
      }
    });
    
    if (error) {
      console.error('Error sending email notification:', error);
      return false;
    }
    
    console.log('Email notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
};

/**
 * Send SMS notification
 */
const sendSmsNotification = async (phoneNumber: string, message: string): Promise<boolean> => {
  try {
    // Call Supabase Edge Function for sending SMS
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        type: 'sms',
        recipient: phoneNumber,
        message: message
      }
    });
    
    if (error) {
      console.error('Error sending SMS notification:', error);
      return false;
    }
    
    console.log('SMS notification sent successfully:', data);
    return true;
  } catch (error) {
    console.error('Error sending SMS notification:', error);
    return false;
  }
};

/**
 * Get all parent contacts
 */
export const getParentContacts = async (): Promise<ParentContact[]> => {
  try {
    const { data, error } = await supabase
      .from('parent_contacts')
      .select('*')
      .order('parent_name', { ascending: true });
    
    if (error) {
      console.error('Error fetching parent contacts:', error);
      return [];
    }
    
    return data as ParentContact[];
  } catch (error) {
    console.error('Error fetching parent contacts:', error);
    return [];
  }
};

/**
 * Add or update parent contact information
 */
export const saveParentContact = async (contact: Omit<ParentContact, 'id'>): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('parent_contacts')
      .upsert({
        id: contact.id || undefined,
        student_id: contact.student_id,
        parent_name: contact.parent_name,
        email: contact.email,
        phone: contact.phone,
        notification_preference: contact.notification_preference
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving parent contact:', error);
      toast.error('Failed to save parent contact information');
      return null;
    }
    
    toast.success('Parent contact information saved successfully');
    return data.id;
  } catch (error) {
    console.error('Error saving parent contact:', error);
    toast.error('Failed to save parent contact information');
    return null;
  }
};
