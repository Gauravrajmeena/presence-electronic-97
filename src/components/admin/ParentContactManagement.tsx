import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sendTestNotification } from '@/services/notification/NotificationService';
import { Plus, Trash2, Send } from 'lucide-react';

interface ParentContact {
  id: string;
  student_id: string;
  name: string;
  email: string;
  phone: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
  };
}

interface ParentContactManagementProps {
  selectedFaceId: string | null;
}

const ParentContactManagement: React.FC<ParentContactManagementProps> = ({ 
  selectedFaceId 
}) => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ParentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    phone: '',
    notification_preferences: {
      email: true,
      sms: true
    }
  });
  
  // Fetch parent contacts for the selected student
  useEffect(() => {
    if (!selectedFaceId) {
      setContacts([]);
      setLoading(false);
      return;
    }
    
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('parent_contacts')
          .select('*')
          .eq('student_id', selectedFaceId);
          
        if (error) throw error;
        setContacts(data as ParentContact[] || []);
      } catch (error) {
        console.error('Error fetching parent contacts:', error);
        toast({
          title: 'Error',
          description: 'Failed to load parent contacts',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchContacts();
  }, [selectedFaceId, toast]);
  
  // Handle adding a new contact
  const handleAddContact = async () => {
    if (!selectedFaceId) return;
    
    try {
      // Validate input fields
      if (!newContact.name.trim()) {
        toast({
          title: 'Missing Information',
          description: 'Parent name is required',
          variant: 'destructive'
        });
        return;
      }
      
      if (!newContact.email.trim() && !newContact.phone.trim()) {
        toast({
          title: 'Missing Information',
          description: 'At least one contact method (email or phone) is required',
          variant: 'destructive'
        });
        return;
      }
      
      const contactData = {
        student_id: selectedFaceId,
        name: newContact.name,
        email: newContact.email,
        phone: newContact.phone,
        notification_preferences: newContact.notification_preferences
      };
      
      const { data, error } = await supabase
        .from('parent_contacts')
        .insert(contactData)
        .select();
        
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Parent contact added successfully',
        variant: 'default'
      });
      
      // Add the new contact to the state
      setContacts([...contacts, data[0] as ParentContact]);
      
      // Reset the form
      setNewContact({
        name: '',
        email: '',
        phone: '',
        notification_preferences: {
          email: true,
          sms: true
        }
      });
    } catch (error) {
      console.error('Error adding parent contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to add parent contact',
        variant: 'destructive'
      });
    }
  };
  
  // Handle deleting a contact
  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this parent contact?')) return;
    
    try {
      const { error } = await supabase
        .from('parent_contacts')
        .delete()
        .eq('id', contactId);
        
      if (error) throw error;
      
      // Remove the deleted contact from the state
      setContacts(contacts.filter(contact => contact.id !== contactId));
      
      toast({
        title: 'Success',
        description: 'Parent contact deleted successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting parent contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete parent contact',
        variant: 'destructive'
      });
    }
  };
  
  // Handle sending a test notification
  const handleSendTestNotification = async (contact: ParentContact) => {
    try {
      const success = await sendTestNotification(contact);
      
      if (success) {
        toast({
          title: 'Success',
          description: 'Test notification sent successfully',
          variant: 'default'
        });
      } else {
        throw new Error('Failed to send notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive'
      });
    }
  };
  
  // Handle preference toggle
  const handleTogglePreference = async (contactId: string, type: 'email' | 'sms', value: boolean) => {
    try {
      const contactToUpdate = contacts.find(c => c.id === contactId);
      if (!contactToUpdate) return;
      
      const updatedPreferences = {
        ...contactToUpdate.notification_preferences,
        [type]: value
      };
      
      const { error } = await supabase
        .from('parent_contacts')
        .update({
          notification_preferences: updatedPreferences
        })
        .eq('id', contactId);
        
      if (error) throw error;
      
      // Update the contact in the state
      setContacts(contacts.map(c => 
        c.id === contactId 
          ? {...c, notification_preferences: updatedPreferences} 
          : c
      ));
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preference',
        variant: 'destructive'
      });
    }
  };
  
  if (!selectedFaceId) {
    return (
      <Card className="p-6 mt-4">
        <p className="text-center text-muted-foreground">
          Select a student to manage parent contacts
        </p>
      </Card>
    );
  }
  
  return (
    <Card className="p-6 mt-4">
      <h3 className="text-lg font-medium mb-4">Parent Contact Management</h3>
      
      {/* Existing Contacts */}
      {contacts.length > 0 ? (
        <div className="space-y-4 mb-6">
          <h4 className="text-sm font-medium">Registered Contacts</h4>
          {contacts.map(contact => (
            <div key={contact.id} className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <h5 className="font-medium">{contact.name}</h5>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleSendTestNotification(contact)}
                    title="Send test notification"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDeleteContact(contact.id)}
                    title="Delete contact"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                {contact.email && (
                  <p className="text-sm">Email: {contact.email}</p>
                )}
                {contact.phone && (
                  <p className="text-sm">Phone: {contact.phone}</p>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id={`email-${contact.id}`}
                    checked={contact.notification_preferences.email}
                    onCheckedChange={(checked) => handleTogglePreference(contact.id, 'email', checked)}
                    disabled={!contact.email}
                  />
                  <Label htmlFor={`email-${contact.id}`}>Email Notifications</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch 
                    id={`sms-${contact.id}`}
                    checked={contact.notification_preferences.sms}
                    onCheckedChange={(checked) => handleTogglePreference(contact.id, 'sms', checked)}
                    disabled={!contact.phone}
                  />
                  <Label htmlFor={`sms-${contact.id}`}>SMS Notifications</Label>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : loading ? (
        <p className="text-center py-4 text-muted-foreground">Loading contacts...</p>
      ) : (
        <p className="text-center py-4 text-muted-foreground">No parent contacts found</p>
      )}
      
      {/* Add New Contact Form */}
      <div className="border-t pt-4 mt-4">
        <h4 className="text-sm font-medium mb-4">Add New Contact</h4>
        <div className="space-y-4">
          <div>
            <Label htmlFor="parent-name">Parent/Guardian Name</Label>
            <Input 
              id="parent-name" 
              value={newContact.name}
              onChange={(e) => setNewContact({...newContact, name: e.target.value})}
              placeholder="Full Name"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parent-email">Email</Label>
              <Input 
                id="parent-email" 
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="parent-phone">Phone Number</Label>
              <Input 
                id="parent-phone" 
                value={newContact.phone}
                onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                placeholder="+1 (123) 456-7890"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="email-pref"
                checked={newContact.notification_preferences.email}
                onCheckedChange={(checked) => setNewContact({
                  ...newContact, 
                  notification_preferences: {
                    ...newContact.notification_preferences,
                    email: checked
                  }
                })}
              />
              <Label htmlFor="email-pref">Email Notifications</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="sms-pref"
                checked={newContact.notification_preferences.sms}
                onCheckedChange={(checked) => setNewContact({
                  ...newContact, 
                  notification_preferences: {
                    ...newContact.notification_preferences,
                    sms: checked
                  }
                })}
              />
              <Label htmlFor="sms-pref">SMS Notifications</Label>
            </div>
          </div>
          
          <Button onClick={handleAddContact} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ParentContactManagement;
