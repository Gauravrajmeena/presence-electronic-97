
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { sendAbsenceNotification } from '@/services/notification/NotificationService';
import { supabase } from '@/integrations/supabase/client';
import { NotificationLog } from '@/types/parentNotification';

const AbsenteeNotifier = () => {
  const [date, setDate] = useState<Date>(new Date());
  const [absentees, setAbsentees] = useState<any[]>([]);
  const [selectedAbsentees, setSelectedAbsentees] = useState<string[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  useEffect(() => {
    fetchAbsentees(date);
    fetchNotificationLogs();
  }, [date]);

  const fetchAbsentees = async (selectedDate: Date) => {
    setLoading(true);
    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch attendance records marked as absent for the selected date
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*, face_profiles!inner(*)')
        .eq('status', 'absent')
        .like('timestamp', `${dateString}%`);

      if (error) throw error;
      
      setAbsentees(data || []);
      setSelectedAbsentees([]);
    } catch (error) {
      console.error('Error fetching absentees:', error);
      toast.error('Failed to load absent students');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationLogs = async () => {
    setFetchingLogs(true);
    try {
      const { data, error } = await supabase
        .from('notification_logs' as any)
        .select('*')
        .order('notification_date', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      setNotificationLogs(data as NotificationLog[] || []);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
    } finally {
      setFetchingLogs(false);
    }
  };

  const handleSelectAbsentee = (studentId: string) => {
    setSelectedAbsentees(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId) 
        : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAbsentees.length === absentees.length) {
      setSelectedAbsentees([]);
    } else {
      setSelectedAbsentees(absentees.map(student => student.id));
    }
  };

  const sendNotifications = async () => {
    if (selectedAbsentees.length === 0) {
      toast.warning('No absentees selected');
      return;
    }

    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Send notification for each selected absentee
      for (const studentId of selectedAbsentees) {
        const student = absentees.find(a => a.id === studentId);
        if (!student) continue;

        const success = await sendAbsenceNotification(
          student.user_id,
          student.face_profiles?.name || 'Unknown Student',
          format(date, 'yyyy-MM-dd')
        );

        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} absence notifications`);
      }
      
      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} notifications`);
      }

      fetchNotificationLogs();
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Failed to send notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absence Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="send">
          <TabsList className="mb-4">
            <TabsTrigger value="send">Send Notifications</TabsTrigger>
            <TabsTrigger value="logs">Notification Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="send" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="block mb-2">Select Date</Label>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  className="border rounded-md"
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Absent Students ({absentees.length})</Label>
                  {absentees.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSelectAll}
                    >
                      {selectedAbsentees.length === absentees.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
                
                {loading ? (
                  <p>Loading absentees...</p>
                ) : absentees.length === 0 ? (
                  <div className="border rounded-md p-4 text-center">
                    <p>No absent students found for this date.</p>
                  </div>
                ) : (
                  <div className="border rounded-md p-2 max-h-[300px] overflow-y-auto space-y-2">
                    {absentees.map((student) => (
                      <div 
                        key={student.id} 
                        className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md"
                      >
                        <Checkbox 
                          checked={selectedAbsentees.includes(student.id)}
                          onCheckedChange={() => handleSelectAbsentee(student.id)}
                          id={`student-${student.id}`}
                        />
                        <Label 
                          htmlFor={`student-${student.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          {student.face_profiles?.name || 'Unknown Student'}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button 
                  className="w-full mt-4" 
                  disabled={loading || selectedAbsentees.length === 0}
                  onClick={sendNotifications}
                >
                  Send Notifications ({selectedAbsentees.length})
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="logs">
            {fetchingLogs ? (
              <p>Loading notification logs...</p>
            ) : notificationLogs.length === 0 ? (
              <p>No notification logs found.</p>
            ) : (
              <div className="space-y-4">
                {notificationLogs.map((log) => (
                  <div key={log.id} className="border rounded-md p-4">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-medium">{log.student_name}</h4>
                        <p className="text-sm text-gray-500">{log.subject}</p>
                      </div>
                      <Badge variant={log.status === 'sent' ? 'success' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-sm mt-2">
                      {log.recipient.email && `Email: ${log.recipient.email}`}
                      {log.recipient.email && log.recipient.phone && ' | '}
                      {log.recipient.phone && `SMS: ${log.recipient.phone}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(log.notification_date).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AbsenteeNotifier;
