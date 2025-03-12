
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sendTestNotification } from '@/services/notification/NotificationService';
import { parseNotificationPreferences, ParentContact } from '@/types/parentNotification';

const ParentContactManagement = () => {
  const [contacts, setContacts] = useState<ParentContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContact, setNewContact] = useState({
    student_id: '',
    name: '',
    email: '',
    phone: '',
    notification_preferences: {
      email: true,
      sms: false
    }
  });
  const [selectedContact, setSelectedContact] = useState<ParentContact | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('parent_contacts' as any)
        .select('*');

      if (error) throw error;

      // Process data with type safety - using any to bypass the TypeScript error
      const parsedContacts: ParentContact[] = [];
      if (data && Array.isArray(data)) {
        for (const contact of data as any[]) {
          try {
            // Each contact object from Supabase needs to be properly shaped for our ParentContact type
            parsedContacts.push({
              id: contact.id,
              student_id: contact.student_id,
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              notification_preferences: parseNotificationPreferences(contact.notification_preferences)
            });
          } catch (err) {
            console.error('Error parsing contact:', err);
          }
        }
      }
      
      setContacts(parsedContacts);
    } catch (error) {
      console.error('Error fetching parent contacts:', error);
      toast.error('Failed to load parent contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('parent_contacts' as any)
        .insert({
          student_id: newContact.student_id,
          name: newContact.name,
          email: newContact.email,
          phone: newContact.phone,
          notification_preferences: newContact.notification_preferences
        });

      if (error) throw error;

      toast.success('Parent contact added successfully');
      setNewContact({
        student_id: '',
        name: '',
        email: '',
        phone: '',
        notification_preferences: {
          email: true,
          sms: false
        }
      });
      fetchContacts();
    } catch (error) {
      console.error('Error adding parent contact:', error);
      toast.error('Failed to add parent contact');
    } finally {
      setLoading(false);
    }
  };

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContact) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('parent_contacts' as any)
        .update({
          name: selectedContact.name,
          email: selectedContact.email,
          phone: selectedContact.phone,
          notification_preferences: selectedContact.notification_preferences
        })
        .eq('id', selectedContact.id);

      if (error) throw error;

      toast.success('Parent contact updated successfully');
      setIsEditing(false);
      setSelectedContact(null);
      fetchContacts();
    } catch (error) {
      console.error('Error updating parent contact:', error);
      toast.error('Failed to update parent contact');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('parent_contacts' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Parent contact deleted successfully');
      fetchContacts();
    } catch (error) {
      console.error('Error deleting parent contact:', error);
      toast.error('Failed to delete parent contact');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestNotification = async (contact: ParentContact) => {
    try {
      setLoading(true);
      const success = await sendTestNotification(contact);
      
      if (success) {
        toast.success('Test notification sent successfully');
      } else {
        toast.error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Parent Contact Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isEditing ? (
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student-id">Student ID</Label>
                <Input 
                  id="student-id" 
                  value={newContact.student_id}
                  onChange={(e) => setNewContact({...newContact, student_id: e.target.value})}
                  placeholder="Enter student ID"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-name">Parent Name</Label>
                <Input 
                  id="parent-name" 
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  placeholder="Enter parent name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-email">Email</Label>
                <Input 
                  id="parent-email" 
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent-phone">Phone Number</Label>
                <Input 
                  id="parent-phone" 
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notification Preferences</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="email-notification" 
                    checked={newContact.notification_preferences.email}
                    onCheckedChange={(checked) => 
                      setNewContact({
                        ...newContact, 
                        notification_preferences: {
                          ...newContact.notification_preferences,
                          email: checked as boolean
                        }
                      })
                    }
                  />
                  <Label htmlFor="email-notification">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sms-notification" 
                    checked={newContact.notification_preferences.sms}
                    onCheckedChange={(checked) => 
                      setNewContact({
                        ...newContact, 
                        notification_preferences: {
                          ...newContact.notification_preferences,
                          sms: checked as boolean
                        }
                      })
                    }
                  />
                  <Label htmlFor="sms-notification">SMS</Label>
                </div>
              </div>
            </div>
            
            <Button type="submit" disabled={loading}>Add Contact</Button>
          </form>
        ) : (
          <form onSubmit={handleEditContact} className="space-y-4">
            {/* Edit form fields similar to add form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-parent-name">Parent Name</Label>
                <Input 
                  id="edit-parent-name" 
                  value={selectedContact?.name || ''}
                  onChange={(e) => setSelectedContact(selectedContact ? {...selectedContact, name: e.target.value} : null)}
                  placeholder="Enter parent name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parent-email">Email</Label>
                <Input 
                  id="edit-parent-email" 
                  type="email"
                  value={selectedContact?.email || ''}
                  onChange={(e) => setSelectedContact(selectedContact ? {...selectedContact, email: e.target.value} : null)}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parent-phone">Phone Number</Label>
                <Input 
                  id="edit-parent-phone" 
                  value={selectedContact?.phone || ''}
                  onChange={(e) => setSelectedContact(selectedContact ? {...selectedContact, phone: e.target.value} : null)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notification Preferences</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-email-notification" 
                    checked={selectedContact?.notification_preferences.email}
                    onCheckedChange={(checked) => {
                      if (selectedContact) {
                        setSelectedContact({
                          ...selectedContact, 
                          notification_preferences: {
                            ...selectedContact.notification_preferences,
                            email: checked as boolean
                          }
                        });
                      }
                    }}
                  />
                  <Label htmlFor="edit-email-notification">Email</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="edit-sms-notification" 
                    checked={selectedContact?.notification_preferences.sms}
                    onCheckedChange={(checked) => {
                      if (selectedContact) {
                        setSelectedContact({
                          ...selectedContact, 
                          notification_preferences: {
                            ...selectedContact.notification_preferences,
                            sms: checked as boolean
                          }
                        });
                      }
                    }}
                  />
                  <Label htmlFor="edit-sms-notification">SMS</Label>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button type="submit" disabled={loading}>Save Changes</Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setSelectedContact(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
        
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-4">Parent Contacts</h3>
          
          {loading ? (
            <p>Loading contacts...</p>
          ) : contacts.length === 0 ? (
            <p>No parent contacts found.</p>
          ) : (
            <div className="space-y-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{contact.name}</h4>
                      <p className="text-sm text-gray-500">Student ID: {contact.student_id}</p>
                      <div className="mt-2">
                        <p className="text-sm">Email: {contact.email}</p>
                        <p className="text-sm">Phone: {contact.phone}</p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {contact.notification_preferences.email && (
                          <Badge variant="outline">Email Notifications</Badge>
                        )}
                        {contact.notification_preferences.sms && (
                          <Badge variant="outline">SMS Notifications</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedContact(contact);
                          setIsEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        Delete
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleSendTestNotification(contact)}
                        disabled={loading}
                      >
                        Test
                      </Button>
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

export default ParentContactManagement;
