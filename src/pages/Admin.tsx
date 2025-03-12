import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from '@/components/ui/button';
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarIcon, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { PageLayout } from '@/components/layouts/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from '@/integrations/supabase/client';
import { AttendanceCalendar } from '@/components/admin/AttendanceCalendar';
import StatsOverview from '@/components/dashboard/StatsOverview';
import StatusChart from '@/components/dashboard/StatusChart';
import WeeklyChart from '@/components/dashboard/WeeklyChart';
import RegisteredFaces from '@/components/dashboard/RegisteredFaces';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { fetchAttendanceStats, fetchRegisteredFaces } from '@/services/dashboard/dashboardService';
import AbsenteeNotifier from '@/components/admin/AbsenteeNotifier';
import ParentContactManagement from '@/components/admin/ParentContactManagement';

const Admin = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [registeredFaces, setRegisteredFaces] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activityData, setActivityData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const stats = await fetchAttendanceStats();
        setAttendanceStats(stats);
        
        const faces = await fetchRegisteredFaces();
        setRegisteredFaces(faces);
        
        setActivityData(stats.recentActivity);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const refetchFaces = async () => {
    setIsLoading(true);
    try {
      const faces = await fetchRegisteredFaces();
      setRegisteredFaces(faces);
    } catch (error) {
      console.error("Error refetching faces:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (date: any) => {
    if (selectedDate === date) {
      setSelectedDate(null);
    } else {
      setSelectedDate(date);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title="Admin Dashboard"
        description="Manage attendance, students, and notifications"
        className="animate-slide-in-down"
      />
      
      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="attendance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-3">
              <StatsOverview isLoading={isLoading} data={attendanceStats} />
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-4">
              <AttendanceCalendar selectedFaceId={selectedFaceId} />
              
              <WeeklyChart isLoading={isLoading} weeklyData={attendanceStats?.weeklyData} />
              
              <RecentActivity isLoading={isLoading} activityData={activityData} />
            </div>
            
            <div className="col-span-1">
              <StatusChart isLoading={isLoading} statusData={attendanceStats?.statusData} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="students" className="space-y-4">
          <RegisteredFaces isLoading={isLoading} faces={registeredFaces} refetchFaces={refetchFaces} />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Coming Soon!</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <AbsenteeNotifier />
            </div>
            <div>
              <ParentContactManagement />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
};

export default Admin;
