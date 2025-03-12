
import React, { useState } from 'react';
import PageLayout from '@/components/layouts/PageLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Grid2X2, ListFilter, Calendar as CalendarIcon, Users, Bell } from 'lucide-react';
import AttendanceCalendarView from '@/components/admin/AttendanceCalendarView';
import ReportControls from '@/components/admin/ReportControls';
import AdminFacesList from '@/components/admin/AdminFacesList';
import ParentContactsManager from '@/components/admin/ParentContactsManager';
import AbsenteeNotifier from '@/components/admin/AbsenteeNotifier';

const Admin = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState('registered');
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  
  return (
    <PageLayout>
      <PageHeader
        title="Admin Dashboard"
        description="Manage students, attendance records, and notifications"
        className="animate-slide-in-down"
      />
      
      <div className="space-y-8">
        <Tabs 
          defaultValue="registered" 
          value={selectedTab}
          onValueChange={setSelectedTab}
          className="animate-slide-in-up"
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="registered" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Registered Faces</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>Attendance Calendar</span>
            </TabsTrigger>
            <TabsTrigger value="parents" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Parent Contacts</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="registered">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-medium">Registered Faces</h2>
                <div className="flex gap-2">
                  <button
                    className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid2X2 className="h-4 w-4" />
                  </button>
                  <button
                    className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                    onClick={() => setViewMode('list')}
                  >
                    <ListFilter className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <AdminFacesList 
                viewMode={viewMode} 
                selectedFaceId={selectedFaceId}
                setSelectedFaceId={setSelectedFaceId}
              />
            </Card>
          </TabsContent>
          
          <TabsContent value="calendar">
            <Card className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium">Attendance Calendar</h2>
                  <ReportControls />
                </div>
                
                <AttendanceCalendarView selectedFaceId={selectedFaceId} />
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="parents">
            <ParentContactsManager />
          </TabsContent>
          
          <TabsContent value="notifications">
            <AbsenteeNotifier />
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default Admin;
