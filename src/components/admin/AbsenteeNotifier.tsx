
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendAbsenceNotification } from '@/services/notification/NotificationService';
import { Bell, CheckCircle, AlertCircle } from 'lucide-react';

interface AbsenteeNotifierProps {
  selectedDate: Date;
}

interface Absentee {
  id: string;
  name: string;
  hasParentContact: boolean;
  notified: boolean;
  notificationId?: string;
}

const AbsenteeNotifier: React.FC<AbsenteeNotifierProps> = ({ selectedDate }) => {
  const { toast } = useToast();
  const [absentees, setAbsentees] = useState<Absentee[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  
  // Format date for queries and display
  const formattedDate = selectedDate.toISOString().split('T')[0];
  const displayDate = selectedDate.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Fetch absentees for the selected date
  useEffect(() => {
    const fetchAbsentees = async () => {
      setLoading(true);
      try {
        // Get all records for the selected date
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('*')
          .gte('timestamp', `${formattedDate}T00:00:00`)
          .lte('timestamp', `${formattedDate}T23:59:59`);
          
        if (attendanceError) throw attendanceError;
        
        // Filter out absent students
        const absentRecords = attendanceData?.filter(record => 
          record.status === 'absent'
        ) || [];
        
        // Get notification logs for this date
        const { data: notificationData, error: notificationError } = await supabase
          .from('notification_logs')
          .select('*')
          .eq('notification_date', formattedDate);
          
        if (notificationError) throw notificationError;
        
        // Process each absent student
        const processedAbsentees = await Promise.all(absentRecords.map(async (record) => {
          // Extract student info
          const deviceInfo = record.device_info as any;
          const name = deviceInfo?.metadata?.name || 'Unknown Student';
          const studentId = record.user_id || '';
          
          // Check if this student has parent contacts
          const { data: contactData } = await supabase
            .from('parent_contacts')
            .select('id')
            .eq('student_id', studentId);
            
          const hasParentContact = contactData && contactData.length > 0;
          
          // Check if notification has already been sent
          const notification = notificationData?.find(n => 
            n.student_name === name && n.status === 'sent'
          );
          
          return {
            id: studentId,
            name,
            hasParentContact,
            notified: !!notification,
            notificationId: notification?.id
          };
        }));
        
        setAbsentees(processedAbsentees);
      } catch (error) {
        console.error('Error fetching absentees:', error);
        toast({
          title: 'Error',
          description: 'Failed to load absent students',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchAbsentees();
  }, [formattedDate, toast]);
  
  // Handle sending notification to a parent
  const handleSendNotification = async (student: Absentee) => {
    if (!student.hasParentContact) {
      toast({
        title: 'No Contact Available',
        description: 'This student has no parent contacts registered',
        variant: 'destructive'
      });
      return;
    }
    
    setSending({...sending, [student.id]: true});
    
    try {
      const success = await sendAbsenceNotification(
        student.id, 
        student.name, 
        formattedDate
      );
      
      if (success) {
        // Update the student in the absentees list
        setAbsentees(absentees.map(a => 
          a.id === student.id
            ? {...a, notified: true}
            : a
        ));
        
        toast({
          title: 'Notification Sent',
          description: `Successfully notified parent of ${student.name}'s absence`,
          variant: 'default'
        });
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Notification Failed',
        description: 'Failed to send absence notification',
        variant: 'destructive'
      });
    } finally {
      setSending({...sending, [student.id]: false});
    }
  };
  
  // Handle sending notifications to all parents
  const handleSendAllNotifications = async () => {
    // Get students who have contacts but haven't been notified
    const studentsToNotify = absentees.filter(
      student => student.hasParentContact && !student.notified
    );
    
    if (studentsToNotify.length === 0) {
      toast({
        title: 'No Notifications Needed',
        description: 'No absent students with parent contacts need to be notified',
        variant: 'default'
      });
      return;
    }
    
    // Set all selected students to sending state
    const sendingState: Record<string, boolean> = {};
    studentsToNotify.forEach(student => {
      sendingState[student.id] = true;
    });
    setSending(sendingState);
    
    // Try to send notifications to each student
    let successCount = 0;
    let failCount = 0;
    
    for (const student of studentsToNotify) {
      try {
        const success = await sendAbsenceNotification(
          student.id,
          student.name,
          formattedDate
        );
        
        if (success) {
          successCount++;
          // Update the student in the absentees list
          setAbsentees(prev => prev.map(a => 
            a.id === student.id
              ? {...a, notified: true}
              : a
          ));
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error notifying parent of ${student.name}:`, error);
        failCount++;
      } finally {
        // Clear sending state for this student
        setSending(prev => ({...prev, [student.id]: false}));
      }
    }
    
    // Show result toast
    if (successCount > 0) {
      toast({
        title: 'Notifications Sent',
        description: `Successfully sent ${successCount} notifications${failCount > 0 ? `, failed to send ${failCount}` : ''}`,
        variant: 'default'
      });
    } else if (failCount > 0) {
      toast({
        title: 'Notifications Failed',
        description: `Failed to send ${failCount} notifications`,
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Card className="p-6 mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Absence Notifications</h3>
        <Button 
          variant="outline"
          onClick={handleSendAllNotifications}
          disabled={absentees.filter(s => s.hasParentContact && !s.notified).length === 0}
        >
          <Bell className="h-4 w-4 mr-2" />
          Notify All Parents
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Absences for {displayDate}
      </p>
      
      {loading ? (
        <p className="text-center py-4 text-muted-foreground">Loading absent students...</p>
      ) : absentees.length > 0 ? (
        <div className="divide-y">
          {absentees.map(student => (
            <div key={student.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{student.name}</p>
                <div className="flex items-center mt-1">
                  {student.notified ? (
                    <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500 px-2 py-1 rounded-full flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Notified
                    </span>
                  ) : student.hasParentContact ? (
                    <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 px-2 py-1 rounded-full">
                      Not Notified
                    </span>
                  ) : (
                    <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500 px-2 py-1 rounded-full flex items-center">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      No Parent Contact
                    </span>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSendNotification(student)}
                disabled={!student.hasParentContact || student.notified || sending[student.id]}
              >
                {sending[student.id] ? 'Sending...' : 'Send Notification'}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center py-4 text-muted-foreground">No absent students found for this date</p>
      )}
    </Card>
  );
};

export default AbsenteeNotifier;
