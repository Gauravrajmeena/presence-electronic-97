
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendAbsenceNotification } from '@/services/notification/NotificationService';
import { NotificationLog } from '@/types/parentNotification';

const AbsenteeNotifier = () => {
  const { toast } = useToast();
  const [absences, setAbsences] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);

  // Fetch absent students and recent notifications on component mount
  useEffect(() => {
    fetchAbsentStudents();
    fetchRecentNotifications();
  }, []);

  // Fetch students marked as absent today
  const fetchAbsentStudents = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*, user_id')
        .eq('status', 'absent')
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`);
        
      if (error) throw error;
      
      // Process data to get student info
      if (data) {
        const processedData = await Promise.all(
          data.map(async (record) => {
            // Try to get student name from profiles
            const { data: profileData } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', record.user_id)
              .maybeSingle();
              
            return {
              id: record.id,
              user_id: record.user_id,
              timestamp: record.timestamp,
              student_name: profileData?.username || 'Unknown Student'
            };
          })
        );
        
        setAbsences(processedData);
      }
    } catch (err) {
      console.error('Error fetching absent students:', err);
      toast({
        title: 'Error',
        description: 'Failed to load absent students',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recent notifications
  const fetchRecentNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      if (data) {
        setRecentNotifications(data as unknown as NotificationLog[]);
      }
    } catch (err) {
      console.error('Error fetching recent notifications:', err);
    }
  };

  // Send notifications to all absent students' parents
  const notifyAllParents = async () => {
    if (absences.length === 0) {
      toast({
        title: 'No Absences',
        description: 'There are no absent students to notify about',
      });
      return;
    }
    
    try {
      setIsNotifying(true);
      let successCount = 0;
      let failCount = 0;
      
      for (const absence of absences) {
        try {
          // Get parent contact info
          const { data: contactData, error: contactError } = await supabase
            .from('parent_contacts' as any)
            .select('*')
            .eq('student_id', absence.user_id)
            .maybeSingle();
            
          if (contactError || !contactData) {
            console.warn(`No parent contact found for student ${absence.student_name}`);
            failCount++;
            continue;
          }
          
          // Send notification
          const date = new Date(absence.timestamp).toLocaleDateString();
          const result = await sendAbsenceNotification(
            absence.user_id,
            absence.student_name,
            date
          );
          
          if (result) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Error notifying for student ${absence.student_name}:`, err);
          failCount++;
        }
      }
      
      // Show results
      if (successCount > 0) {
        toast({
          title: 'Notifications Sent',
          description: `Successfully sent ${successCount} notifications. Failed: ${failCount}`,
          variant: successCount > 0 ? 'default' : 'destructive'
        });
        
        // Refresh notifications list
        fetchRecentNotifications();
      } else {
        toast({
          title: 'Notification Failed',
          description: 'Failed to send any notifications',
          variant: 'destructive'
        });
      }
    } catch (err) {
      console.error('Error sending notifications:', err);
      toast({
        title: 'Error',
        description: 'Failed to send notifications',
        variant: 'destructive'
      });
    } finally {
      setIsNotifying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absence Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Absent Students Today</h3>
            {isLoading ? (
              <p className="text-muted-foreground py-2">Loading...</p>
            ) : absences.length > 0 ? (
              <div className="space-y-2 mt-2">
                {absences.map((absence) => (
                  <div key={absence.id} className="flex justify-between items-center border rounded-md p-2">
                    <div>
                      <p className="font-medium">{absence.student_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Absent since {new Date(absence.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                
                <div className="mt-4">
                  <Button 
                    onClick={notifyAllParents} 
                    disabled={isNotifying}
                  >
                    {isNotifying ? 'Sending Notifications...' : 'Notify All Parents'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-2">No absent students recorded today.</p>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <h3 className="text-lg font-medium mb-2">Recent Notifications</h3>
            {recentNotifications.length > 0 ? (
              <div className="space-y-2">
                {recentNotifications.map((notification: NotificationLog) => (
                  <div key={notification.id} className="border rounded-md p-2">
                    <div className="flex justify-between">
                      <p className="font-medium">{notification.student_name}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        notification.status === 'sent' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500'
                      }`}>
                        {notification.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(notification.notification_date).toLocaleDateString()}{' '}
                      {notification.email_status === 'sent' && '📧'}{' '}
                      {notification.sms_status === 'sent' && '📱'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No recent notifications.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AbsenteeNotifier;
