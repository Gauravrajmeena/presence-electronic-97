
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendAbsenceNotification } from '@/services/notification/NotificationService';

type AttendanceRecord = {
  id: string;
  user_id: string;
  student_name: string;
  timestamp: string;
  status: string;
};

const AbsenteeNotifier: React.FC = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [absentStudents, setAbsentStudents] = useState<{ id: string, name: string }[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<Record<string, 'pending' | 'sent' | 'error'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [notificationLog, setNotificationLog] = useState<{ id: string, timestamp: string, recipient: string }[]>([]);
  
  useEffect(() => {
    if (selectedDate) {
      fetchAbsentStudents(selectedDate);
    }
  }, [selectedDate]);
  
  const fetchAbsentStudents = async (date: Date) => {
    setIsLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // First get all registered students
      const { data: registeredStudents, error: studentError } = await supabase
        .from('attendance_records')
        .select('user_id, device_info')
        .contains('device_info', { registration: true });
        
      if (studentError) throw studentError;
      
      // Format registered students
      const students = registeredStudents.map(record => {
        const deviceInfo = record.device_info as any;
        const metadata = deviceInfo?.metadata || {};
        
        return {
          id: record.user_id as string,
          name: metadata.name || 'Unknown'
        };
      });
      
      // Get present students for the selected date
      const { data: presentStudents, error: presentError } = await supabase
        .from('attendance_records')
        .select('user_id')
        .eq('status', 'present')
        .gte('timestamp', `${dateStr}T00:00:00`)
        .lte('timestamp', `${dateStr}T23:59:59`);
        
      if (presentError) throw presentError;
      
      // Filter out students who were present
      const presentIds = new Set(presentStudents.map(record => record.user_id));
      const absent = students.filter(student => !presentIds.has(student.id));
      
      setAbsentStudents(absent);
      
      // Reset notification status for new set of absent students
      const statusObj: Record<string, 'pending' | 'sent' | 'error'> = {};
      absent.forEach(student => {
        statusObj[student.id] = 'pending';
      });
      setNotificationStatus(statusObj);
      
      // Fetch notification log for this date
      fetchNotificationLog(dateStr);
      
    } catch (error) {
      console.error('Error fetching absent students:', error);
      toast({
        title: "Error",
        description: "Failed to load absent students",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchNotificationLog = async (dateStr: string) => {
    try {
      const { data, error } = await supabase
        .from('notification_logs')
        .select('id, sent_at, parent_contact_id, student_id')
        .gte('sent_at', `${dateStr}T00:00:00`)
        .lte('sent_at', `${dateStr}T23:59:59`)
        .eq('notification_type', 'absence')
        .order('sent_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        // Get parent contacts for these notifications
        const parentContactIds = [...new Set(data.map(log => log.parent_contact_id))];
        
        if (parentContactIds.length > 0) {
          const { data: contacts, error: contactError } = await supabase
            .from('parent_contacts')
            .select('id, parent_name')
            .in('id', parentContactIds);
            
          if (contactError) throw contactError;
          
          const contactMap = new Map(contacts.map(contact => [contact.id, contact.parent_name]));
          
          // Mark students as already notified
          const notifiedStudentIds = new Set(data.map(log => log.student_id));
          
          setNotificationStatus(prev => {
            const updated = { ...prev };
            notifiedStudentIds.forEach(id => {
              if (updated[id]) updated[id] = 'sent';
            });
            return updated;
          });
          
          // Update notification log
          setNotificationLog(data.map(log => ({
            id: log.id,
            timestamp: new Date(log.sent_at).toLocaleTimeString(),
            recipient: contactMap.get(log.parent_contact_id) || 'Unknown Parent'
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching notification log:', error);
    }
  };
  
  const handleSendAllNotifications = async () => {
    const pendingStudents = absentStudents.filter(student => 
      notificationStatus[student.id] === 'pending'
    );
    
    if (pendingStudents.length === 0) {
      toast({
        title: "Info",
        description: "No pending notifications to send",
        variant: "default"
      });
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to send absence notifications to parents of ${pendingStudents.length} students?`
    );
    
    if (!confirmed) return;
    
    setIsLoading(true);
    
    const results = await Promise.all(
      pendingStudents.map(async (student) => {
        try {
          const success = await sendAbsenceNotification(
            student.id,
            student.name,
            selectedDate
          );
          
          return { 
            studentId: student.id,
            success: success
          };
        } catch (error) {
          console.error(`Error sending notification for ${student.name}:`, error);
          return { 
            studentId: student.id, 
            success: false 
          };
        }
      })
    );
    
    // Update notification status based on results
    const newStatus = { ...notificationStatus };
    results.forEach(result => {
      newStatus[result.studentId] = result.success ? 'sent' : 'error';
    });
    
    setNotificationStatus(newStatus);
    
    // Fetch updated notification log
    fetchNotificationLog(selectedDate.toISOString().split('T')[0]);
    
    setIsLoading(false);
    
    const successCount = results.filter(r => r.success).length;
    
    toast({
      title: successCount > 0 ? "Success" : "Warning",
      description: successCount > 0 
        ? `Successfully sent ${successCount} out of ${results.length} notifications`
        : "Failed to send notifications",
      variant: successCount > 0 ? "default" : "destructive"
    });
  };
  
  const handleSendIndividualNotification = async (studentId: string, studentName: string) => {
    setNotificationStatus(prev => ({
      ...prev,
      [studentId]: 'pending'
    }));
    
    try {
      const success = await sendAbsenceNotification(
        studentId,
        studentName,
        selectedDate
      );
      
      setNotificationStatus(prev => ({
        ...prev,
        [studentId]: success ? 'sent' : 'error'
      }));
      
      toast({
        title: success ? "Success" : "Error",
        description: success
          ? `Notification sent for ${studentName}`
          : `Failed to send notification for ${studentName}`,
        variant: success ? "default" : "destructive"
      });
      
      // Refresh notification log
      fetchNotificationLog(selectedDate.toISOString().split('T')[0]);
    } catch (error) {
      console.error(`Error sending notification for ${studentName}:`, error);
      
      setNotificationStatus(prev => ({
        ...prev,
        [studentId]: 'error'
      }));
      
      toast({
        title: "Error",
        description: `Failed to send notification for ${studentName}`,
        variant: "destructive"
      });
    }
  };
  
  const getStatusBadge = (status: 'pending' | 'sent' | 'error') => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };
  
  const pendingCount = Object.values(notificationStatus).filter(s => s === 'pending').length;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Absence Notifications
          </CardTitle>
          <CardDescription>
            Send automated notifications to parents of absent students
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium mb-2">Select Date</h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                disabled={(date) => date > new Date()}
                className="border rounded-md p-3"
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Absent Students</h3>
                <div className="flex items-center">
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={handleSendAllNotifications}
                    disabled={isLoading || pendingCount === 0}
                    className="flex items-center gap-1"
                  >
                    <Send className="h-3 w-3" />
                    Send All Notifications ({pendingCount})
                  </Button>
                </div>
              </div>
              
              <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : absentStudents.length > 0 ? (
                  <div className="space-y-2">
                    {absentStudents.map(student => (
                      <div key={student.id} className="flex items-center justify-between rounded-md border p-2">
                        <div>
                          <p className="font-medium text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {student.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(notificationStatus[student.id])}
                          {notificationStatus[student.id] !== 'sent' && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => handleSendIndividualNotification(student.id, student.name)}
                              disabled={isLoading}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mb-2" />
                    <p>No absences recorded for this date</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {notificationLog.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Notification History</h3>
              <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto">
                <div className="space-y-2">
                  {notificationLog.map(log => (
                    <div key={log.id} className="flex items-center justify-between text-sm p-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Send className="h-3 w-3 text-primary" />
                        <span>Notification sent to {log.recipient}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AbsenteeNotifier;
