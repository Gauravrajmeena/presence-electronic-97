
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Search, User, UserCheck, Calendar, MoreVertical } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminFacesListProps {
  viewMode: 'grid' | 'list';
  selectedFaceId: string | null;
  setSelectedFaceId: (id: string | null) => void;
}

interface RegisteredFace {
  id: string;
  name: string;
  employee_id: string;
  department: string;
  image_url: string;
  position?: string;
  total_attendance: number;
  last_attendance?: string;
}

const AdminFacesList: React.FC<AdminFacesListProps> = ({ 
  viewMode, 
  selectedFaceId,
  setSelectedFaceId
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [faces, setFaces] = useState<RegisteredFace[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [attendanceCounts, setAttendanceCounts] = useState<Record<string, number>>({});

  const filteredFaces = faces.filter(face => 
    face.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    face.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    face.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchRegisteredFaces();

    const attendanceChannel = supabase
      .channel('attendance-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance_records',
        }, 
        () => {
          console.log('Real-time update received for attendance_records');
          fetchRegisteredFaces();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(attendanceChannel);
    };
  }, []);

  const fetchRegisteredFaces = async () => {
    try {
      setIsLoading(true);
      const { data: registrationRecords, error } = await supabase
        .from('attendance_records')
        .select('*')
        .contains('device_info', { registration: true });

      if (error) throw error;

      if (registrationRecords) {
        const processedFaces = registrationRecords.map(record => {
          const deviceInfo = record.device_info as any;
          const metadata = deviceInfo?.metadata || {};

          return {
            id: record.id,
            name: metadata.name || 'Unknown',
            employee_id: metadata.employee_id || 'N/A',
            department: metadata.department || 'N/A',
            position: metadata.position || 'Student',
            image_url: metadata.firebase_image_url || '',
            total_attendance: 0,
            last_attendance: record.timestamp || 'Never'
          };
        });

        setFaces(processedFaces);
        
        if (selectedFaceId && !processedFaces.some(face => face.id === selectedFaceId)) {
          setSelectedFaceId(null);
        }

        for (const face of processedFaces) {
          fetchAttendanceCount(face.employee_id);
        }
      }
    } catch (error) {
      console.error('Error fetching registered faces:', error);
      toast({
        title: "Error",
        description: "Failed to load registered faces",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceCount = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('status', 'present')
        .contains('device_info', { employee_id: employeeId });

      if (error) throw error;

      setAttendanceCounts(prev => ({
        ...prev,
        [employeeId]: data?.length || 0
      }));

      setFaces(prev => prev.map(face => {
        if (face.employee_id === employeeId) {
          return {
            ...face,
            total_attendance: data?.length || 0
          };
        }
        return face;
      }));
    } catch (error) {
      console.error(`Error fetching attendance count for ${employeeId}:`, error);
    }
  };

  const handleDeleteFace = async (id: string) => {
    if (!confirm("Are you sure you want to delete this registered face?")) return;
    
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Face data deleted successfully",
        variant: "default"
      });
      
      if (id === selectedFaceId) {
        setSelectedFaceId(null);
      }
      
      await fetchRegisteredFaces();
    } catch (error) {
      console.error('Error deleting face:', error);
      toast({
        title: "Error",
        description: "Failed to delete face data",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID, or department..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setSelectedFaceId(null)}
          disabled={!selectedFaceId}
        >
          Clear Selection
        </Button>
      </div>

      {filteredFaces.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="flex flex-col items-center justify-center gap-2">
            <User className="h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-medium">No registered faces found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms' : 'Register new faces to see them here'}
            </p>
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFaces.map((face) => (
            <Card 
              key={face.id} 
              className={`overflow-hidden transition-all cursor-pointer hover:shadow-md ${
                selectedFaceId === face.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedFaceId(face.id === selectedFaceId ? null : face.id)}
            >
              <CardContent className="p-0">
                <div className="relative">
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    {face.image_url ? (
                      <img 
                        src={face.image_url} 
                        alt={face.name} 
                        className="object-cover w-full h-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${face.name}&background=random`;
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full">
                        <User className="h-24 w-24 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFace(face.id);
                        }}>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium truncate">{face.name}</h3>
                    <Badge variant="outline" className="ml-2 shrink-0">
                      ID: {face.employee_id}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{face.department}</p>
                  <div className="flex items-center justify-between pt-2 text-sm">
                    <div className="flex items-center gap-1">
                      <UserCheck className="h-4 w-4 text-green-500" />
                      <span>{face.total_attendance} attendances</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Last: {
                        face.last_attendance === 'Never' 
                          ? 'Never' 
                          : new Date(face.last_attendance).toLocaleDateString()
                      }</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium">Photo</th>
                  <th className="py-3 px-4 text-left font-medium">Name</th>
                  <th className="py-3 px-4 text-left font-medium">ID</th>
                  <th className="py-3 px-4 text-left font-medium">Department</th>
                  <th className="py-3 px-4 text-left font-medium">Position</th>
                  <th className="py-3 px-4 text-center font-medium">Attendance</th>
                  <th className="py-3 px-4 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaces.map((face) => (
                  <tr 
                    key={face.id} 
                    className={`border-b hover:bg-muted/50 cursor-pointer ${
                      selectedFaceId === face.id ? 'bg-muted/50' : ''
                    }`}
                    onClick={() => setSelectedFaceId(face.id === selectedFaceId ? null : face.id)}
                  >
                    <td className="py-3 px-4">
                      {face.image_url ? (
                        <img 
                          src={face.image_url} 
                          alt={face.name} 
                          className="h-10 w-10 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${face.name}&background=random`;
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">{face.name}</td>
                    <td className="py-3 px-4">{face.employee_id}</td>
                    <td className="py-3 px-4">{face.department}</td>
                    <td className="py-3 px-4">{face.position || 'Student'}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={face.total_attendance > 0 ? "default" : "outline"}>
                        {face.total_attendance}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFace(face.id);
                          }}>
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFacesList;
