import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { sendAbsenceNotification } from '@/services/notification/NotificationService';
import { NotificationLog } from '@/types/parentNotification';

const AbsenteeNotifier = () => {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSending, setIsSending] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotificationLogs();
  }, []);

  const handleSendNotification = async () => {
    if (!studentId || !studentName || !date) {
      toast.error('Please fill in all fields.');
      return;
    }

    setIsSending(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const success = await sendAbsenceNotification(studentId, studentName, formattedDate);
      if (success) {
        toast.success('Absence notification sent successfully!');
        fetchNotificationLogs(); // Refresh logs after sending
      } else {
        toast.error('Failed to send absence notification.');
      }
    } catch (error) {
      console.error('Error sending absence notification:', error);
      toast.error('Error sending absence notification.');
    } finally {
      setIsSending(false);
    }
  };

  const fetchNotificationLogs = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('notification_logs' as any)
        .select('*')
        .order('notification_date', { ascending: false });

      if (error) throw error;
      
      // Explicitly cast to NotificationLog[] to fix type errors
      setNotificationLogs((data || []) as unknown as NotificationLog[]);
    } catch (error) {
      console.error('Error fetching notification logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Absentee Notifier</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="student-id">Student ID</Label>
          <Input
            id="student-id"
            placeholder="Enter student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="student-name">Student Name</Label>
          <Input
            id="student-name"
            placeholder="Enter student name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Date of Absence</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={'outline'}
                className={cn(
                  'w-[240px] justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center" side="bottom">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) =>
                  date > new Date() || date < new Date('2020-01-01')
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={handleSendNotification} disabled={isSending}>
          {isSending ? (
            <>
              Sending <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            </>
          ) : (
            'Send Notification'
          )}
        </Button>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Notification Logs</h3>
          {loading ? (
            <p>Loading logs...</p>
          ) : notificationLogs.length === 0 ? (
            <p>No notifications sent yet.</p>
          ) : (
            <div className="space-y-4">
              {notificationLogs.map((log) => (
                <div key={log.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{log.subject}</h4>
                      <p className="text-sm text-gray-500">Student: {log.student_name}</p>
                      <p className="text-sm text-gray-500">Date: {log.notification_date}</p>
                      <div className="mt-2">
                        <p className="text-sm">Recipient Email: {log.recipient.email || 'N/A'}</p>
                        <p className="text-sm">Recipient Phone: {log.recipient.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <Badge variant="secondary">{log.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AbsenteeNotifier;
