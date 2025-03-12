
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, UserPlus, Mail, Phone, Bell, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  getParentContacts, 
  saveParentContact, 
  ParentContact 
} from '@/services/notification/NotificationService';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  name: string;
  employee_id: string;
  department: string;
}

const ParentContactsManager: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [parentContacts, setParentContacts] = useState<ParentContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<ParentContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Partial<ParentContact> | null>(null);
  
  // Fetch parent contacts and students on component mount
  useEffect(() => {
    fetchData();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('parent-contacts-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'parent_contacts' 
        }, 
        () => fetchData()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  
  // Filter contacts when search term changes
  useEffect(() => {
    if (searchTerm) {
      const filtered = parentContacts.filter(contact => 
        contact.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getStudentName(contact.student_id).toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(parentContacts);
    }
  }, [searchTerm, parentContacts]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch registered faces (students)
      const { data: registrationRecords, error } = await supabase
        .from('attendance_records')
        .select('*')
        .contains('device_info', { registration: true });
        
      if (error) throw error;
      
      if (registrationRecords) {
        const studentList = registrationRecords.map(record => {
          const deviceInfo = record.device_info as any;
          const metadata = deviceInfo?.metadata || {};
          
          return {
            id: record.user_id as string,
            name: metadata.name || 'Unknown',
            employee_id: metadata.employee_id || 'N/A',
            department: metadata.department || 'N/A'
          };
        });
        
        setStudents(studentList);
      }
      
      // Fetch parent contacts
      const contacts = await getParentContacts();
      setParentContacts(contacts);
      setFilteredContacts(contacts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load parent contacts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getStudentName = (studentId: string): string => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };
  
  const handleAddEditContact = (contact: ParentContact | null = null) => {
    setEditingContact(contact || {
      student_id: '',
      parent_name: '',
      email: '',
      phone: '',
      notification_preference: 'email'
    });
    setDialogOpen(true);
  };
  
  const handleSaveContact = async () => {
    if (!editingContact || !editingContact.student_id || !editingContact.parent_name) {
      toast({
        title: "Error",
        description: "Student and parent name are required",
        variant: "destructive"
      });
      return;
    }
    
    if (!editingContact.email && !editingContact.phone) {
      toast({
        title: "Error",
        description: "Email or phone number is required",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await saveParentContact(editingContact as Omit<ParentContact, 'id'>);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };
  
  const getNotificationPreferenceIcon = (preference: string) => {
    switch(preference) {
      case 'email':
        return <Mail className="h-4 w-4 text-blue-500" />;
      case 'sms':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'both':
        return <Bell className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Parent Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Parent Contacts</CardTitle>
        <Button onClick={() => handleAddEditContact()}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by parent or student name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="sms">SMS</TabsTrigger>
              <TabsTrigger value="both">Both</TabsTrigger>
            </TabsList>
            
            {['all', 'email', 'sms', 'both'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-2 mt-4">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No parent contacts found
                  </div>
                ) : (
                  filteredContacts
                    .filter(contact => tab === 'all' || contact.notification_preference === tab)
                    .map(contact => (
                      <div 
                        key={contact.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleAddEditContact(contact)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{contact.parent_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Student: {getStudentName(contact.student_id)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {contact.email && (
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="h-3 w-3" />
                              <span className="hidden md:inline">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3" />
                              <span className="hidden md:inline">{contact.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs">
                            {getNotificationPreferenceIcon(contact.notification_preference)}
                            <span className="capitalize">{contact.notification_preference}</span>
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingContact?.id ? 'Edit' : 'Add'} Parent Contact</DialogTitle>
              <DialogDescription>
                Enter parent contact information to enable absence notifications.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="student" className="text-right">
                  Student
                </Label>
                <div className="col-span-3">
                  <Select
                    value={editingContact?.student_id || ''}
                    onValueChange={(value) => setEditingContact(prev => ({ ...prev, student_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map(student => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.employee_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="parentName" className="text-right">
                  Parent Name
                </Label>
                <Input
                  id="parentName"
                  className="col-span-3"
                  value={editingContact?.parent_name || ''}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, parent_name: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="col-span-3"
                  value={editingContact?.email || ''}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  className="col-span-3"
                  value={editingContact?.phone || ''}
                  onChange={(e) => setEditingContact(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="preference" className="text-right">
                  Notification
                </Label>
                <Select
                  value={editingContact?.notification_preference || 'email'}
                  onValueChange={(value: 'email' | 'sms' | 'both' | 'none') => 
                    setEditingContact(prev => ({ ...prev, notification_preference: value }))
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="both">Both Email & SMS</SelectItem>
                    <SelectItem value="none">No Notifications</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContact}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ParentContactsManager;
