
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Trash2, X, Check, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ParentContact, parseNotificationPreferences } from '@/types/parentNotification';
import { sendTestNotification } from '@/services/notification/NotificationService';

const ParentContactManagement = () => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ParentContact[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<ParentContact>>({
    name: '',
    email: '',
    phone: '',
    student_id: '',
    notification_preferences: {
      email: true,
      sms: true
    }
  });
  
  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);
  
  // Fetch parent contacts from the database
  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('parent_contacts' as any)
        .select('*');
        
      if (error) throw error;
      
      if (data) {
        // Transform the data and parse notification preferences
        const processedContacts = data.map(contact => {
          // Ensure notification_preferences is properly parsed
          let preferences = { email: false, sms: false };
          
          try {
            if (contact.notification_preferences) {
              preferences = parseNotificationPreferences(contact.notification_preferences);
            }
          } catch (e) {
            console.error('Error parsing preferences', e);
          }
          
          return {
            ...contact,
            notification_preferences: preferences
          } as ParentContact;
        });
        
        setContacts(processedContacts);
      }
    } catch (err) {
      console.error('Error fetching parent contacts:', err);
      toast({
        title: 'Error',
        description: 'Failed to load parent contacts',
        variant: 'destructive'
      });
    }
  };
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle notification preferences toggle
  const handleTogglePreference = (type: 'email' | 'sms') => {
    setFormData(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [type]: !prev.notification_preferences?.[type]
      }
    }));
  };
  
  // Add new contact
  const handleAddContact = async () => {
    try {
      // Validate form data
      if (!formData.name || !formData.student_id) {
        toast({
          title: 'Validation Error',
          description: 'Name and Student ID are required',
          variant: 'destructive'
        });
        return;
      }
      
      // Insert new contact
      const { data, error } = await supabase
        .from('parent_contacts' as any)
        .insert({
          student_id: formData.student_id,
          name: formData.name,
          email: formData.email || '',
          phone: formData.phone || '',
          notification_preferences: formData.notification_preferences
        } as any)
        .select();
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Parent contact added successfully',
      });
      
      // Reset form and refresh contacts
      setFormData({
        name: '',
        email: '',
        phone: '',
        student_id: '',
        notification_preferences: {
          email: true,
          sms: true
        }
      });
      setIsAddingNew(false);
      fetchContacts();
    } catch (err) {
      console.error('Error adding parent contact:', err);
      toast({
        title: 'Error',
        description: 'Failed to add parent contact',
        variant: 'destructive'
      });
    }
  };
  
  // Update existing contact
  const handleUpdateContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('parent_contacts' as any)
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          notification_preferences: formData.notification_preferences
        } as any)
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Parent contact updated successfully',
      });
      
      setIsEditing(null);
      fetchContacts();
    } catch (err) {
      console.error('Error updating parent contact:', err);
      toast({
        title: 'Error',
        description: 'Failed to update parent contact',
        variant: 'destructive'
      });
    }
  };
  
  // Delete contact
  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    
    try {
      const { error } = await supabase
        .from('parent_contacts' as any)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Parent contact deleted successfully',
      });
      
      fetchContacts();
    } catch (err) {
      console.error('Error deleting parent contact:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete parent contact',
        variant: 'destructive'
      });
    }
  };
  
  // Set up editing state
  const handleEdit = (contact: ParentContact) => {
    setFormData({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      student_id: contact.student_id,
      notification_preferences: contact.notification_preferences
    });
    setIsEditing(contact.id);
  };
  
  // Send test notification
  const handleSendTest = async (contact: ParentContact) => {
    try {
      toast({
        title: 'Sending Test',
        description: 'Sending test notification...',
      });
      
      const result = await sendTestNotification(contact);
      
      if (result) {
        toast({
          title: 'Success',
          description: 'Test notification sent successfully',
        });
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (err) {
      console.error('Error sending test notification:', err);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Parent Contacts</CardTitle>
        <Button 
          size="sm" 
          onClick={() => {
            setFormData({
              name: '',
              email: '',
              phone: '',
              student_id: '',
              notification_preferences: {
                email: true,
                sms: true
              }
            });
            setIsAddingNew(true);
          }}
          disabled={isAddingNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </CardHeader>
      <CardContent>
        {isAddingNew && (
          <div className="border rounded-lg p-4 mb-4">
            <h4 className="font-medium mb-3">Add New Contact</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="student_id">Student ID</Label>
                <Input 
                  id="student_id" 
                  name="student_id" 
                  value={formData.student_id || ''} 
                  onChange={handleChange} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="name">Parent/Guardian Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  value={formData.name || ''} 
                  onChange={handleChange} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  value={formData.email || ''} 
                  onChange={handleChange} 
                  className="mt-1" 
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  name="phone" 
                  value={formData.phone || ''} 
                  onChange={handleChange} 
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <Label>Notification Preferences</Label>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="email_pref" 
                  checked={formData.notification_preferences?.email || false}
                  onCheckedChange={() => handleTogglePreference('email')}
                />
                <Label htmlFor="email_pref">Email Notifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch 
                  id="sms_pref" 
                  checked={formData.notification_preferences?.sms || false}
                  onCheckedChange={() => handleTogglePreference('sms')}
                />
                <Label htmlFor="sms_pref">SMS Notifications</Label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddContact}>
                Save Contact
              </Button>
            </div>
          </div>
        )}
        
        {contacts.length > 0 ? (
          <div className="space-y-4">
            {contacts.map(contact => (
              <div 
                key={contact.id} 
                className="border rounded-lg p-4"
              >
                {isEditing === contact.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`edit_name_${contact.id}`}>Name</Label>
                        <Input 
                          id={`edit_name_${contact.id}`} 
                          name="name" 
                          value={formData.name || ''} 
                          onChange={handleChange} 
                          className="mt-1" 
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit_email_${contact.id}`}>Email</Label>
                        <Input 
                          id={`edit_email_${contact.id}`} 
                          name="email" 
                          value={formData.email || ''} 
                          onChange={handleChange} 
                          className="mt-1" 
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit_phone_${contact.id}`}>Phone</Label>
                        <Input 
                          id={`edit_phone_${contact.id}`} 
                          name="phone" 
                          value={formData.phone || ''} 
                          onChange={handleChange} 
                          className="mt-1" 
                        />
                      </div>
                      <div>
                        <Label>Notification Preferences</Label>
                        <div className="space-y-2 mt-1">
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id={`edit_email_pref_${contact.id}`} 
                              checked={formData.notification_preferences?.email || false}
                              onCheckedChange={() => handleTogglePreference('email')}
                            />
                            <Label htmlFor={`edit_email_pref_${contact.id}`}>Email Notifications</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              id={`edit_sms_pref_${contact.id}`} 
                              checked={formData.notification_preferences?.sms || false}
                              onCheckedChange={() => handleTogglePreference('sms')}
                            />
                            <Label htmlFor={`edit_sms_pref_${contact.id}`}>SMS Notifications</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsEditing(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleUpdateContact(contact.id)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{contact.name}</h4>
                        <p className="text-sm text-muted-foreground">Student ID: {contact.student_id}</p>
                      </div>
                      <div className="flex space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleSendTest(contact)}
                        >
                          Test
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEdit(contact)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Email: </span>
                        {contact.email || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Phone: </span>
                        {contact.phone || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Email Notifications: </span>
                        {contact.notification_preferences?.email ? 'Enabled' : 'Disabled'}
                      </div>
                      <div>
                        <span className="font-medium">SMS Notifications: </span>
                        {contact.notification_preferences?.sms ? 'Enabled' : 'Disabled'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No parent contacts found. Add a new contact to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ParentContactManagement;
