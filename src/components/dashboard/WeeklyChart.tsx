
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface WeeklyChartProps {
  isLoading: boolean;
  weeklyData?: {
    name: string;
    present: number;
    absent: number;
    late: number;
  }[];
}

const WeeklyChart: React.FC<WeeklyChartProps> = ({ isLoading, weeklyData }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-md font-medium">Weekly Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = weeklyData || [
    { name: 'Mon', present: 0, absent: 0, late: 0 },
    { name: 'Tue', present: 0, absent: 0, late: 0 },
    { name: 'Wed', present: 0, absent: 0, late: 0 },
    { name: 'Thu', present: 0, absent: 0, late: 0 },
    { name: 'Fri', present: 0, absent: 0, late: 0 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium">Weekly Attendance</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="present" name="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default WeeklyChart;
