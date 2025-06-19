
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { FeedbackSubmission, FeedbackType } from '@/types';
import { getFeedbackSubmissions, updateFeedbackStatus } from '@/lib/firestoreService'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MessageSquareWarning, Bug, Lightbulb, HelpCircle, CheckCircle, Settings, RotateCcw } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


const getFeedbackTypeIcon = (type: FeedbackType) => {
  switch (type) {
    case 'bug': return <Bug className="h-4 w-4 text-destructive" />;
    case 'feature_request': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
    case 'question': return <HelpCircle className="h-4 w-4 text-blue-500" />;
    default: return <MessageSquareWarning className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusBadgeColorClass = (status?: FeedbackSubmission['status']): string => {
     switch (status) {
        case 'new': return "bg-blue-500 hover:bg-blue-600 text-white"; 
        case 'resolved': return "bg-green-500 hover:bg-green-600 text-white";
        case 'in_progress': return "bg-yellow-500 hover:bg-yellow-600 text-black";
        case 'seen': return "bg-gray-300 hover:bg-gray-400 text-black";
        case 'wont_fix': return "bg-red-200 hover:bg-red-300 text-red-800";
        default: return "bg-gray-200 hover:bg-gray-300";
    }
};


export default function AdminFeedbackPage() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchFeedback = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await getFeedbackSubmissions();
      // Sort by createdAt descending, then by status (new first)
      items.sort((a, b) => {
        const statusOrder = (s?: FeedbackSubmission['status']) => {
          switch (s) {
            case 'new': return 1;
            case 'seen': return 2;
            case 'in_progress': return 3;
            case 'resolved': return 4;
            case 'wont_fix': return 5;
            default: return 6;
          }
        };
        if (statusOrder(a.status) !== statusOrder(b.status)) {
          return statusOrder(a.status) - statusOrder(b.status);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setFeedbackItems(items);
    } catch (error) {
      console.error("Error fetching feedback submissions:", error);
      toast({ title: "Error", description: "Could not fetch feedback.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser?.isAppAdmin) {
      fetchFeedback();
    }
  }, [currentUser, fetchFeedback]);

  const handleStatusChange = async (feedbackId: string, newStatus: FeedbackSubmission['status']) => {
    if (!feedbackId || !newStatus) return;
    const originalStatus = feedbackItems.find(item => item.id === feedbackId)?.status;
    // Optimistically update UI
    setFeedbackItems(prevItems => 
      prevItems.map(item => item.id === feedbackId ? { ...item, status: newStatus, updatedAt: new Date() as any } : item)
    );
    try {
      await updateFeedbackStatus(feedbackId, newStatus);
      toast({ title: "Status Updated", description: `Feedback status changed to ${newStatus}.` });
      // Optional: refetch to ensure consistency, though optimistic update handles UI
      // fetchFeedback(); 
    } catch (error) {
      console.error("Error updating feedback status:", error);
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
      // Revert optimistic update on error
      setFeedbackItems(prevItems => 
        prevItems.map(item => item.id === feedbackId ? { ...item, status: originalStatus } : item)
      );
    }
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="flex items-center"><MessageSquareWarning className="mr-2 h-5 w-5"/> User Feedback Submissions ({feedbackItems.length})</CardTitle>
            <CardDescription>Review and manage feedback and bug reports submitted by users.</CardDescription>
        </div>
        <Button variant="outline" onClick={fetchFeedback} disabled={isLoading}><RotateCcw className="mr-2 h-4 w-4"/>Refresh</Button>
      </CardHeader>
      <CardContent>
        {feedbackItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No feedback submissions yet.</p>
        ) : (
          <ScrollArea className="h-[calc(100vh-20rem)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Type</TableHead>
                  <TableHead className="w-[200px]">Subject</TableHead>
                  <TableHead className="w-[200px]">User</TableHead>
                  <TableHead className="w-[150px]">Submitted</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedbackItems.map((item) => (
                  <TableRow key={item.id} className={item.status === 'resolved' || item.status === 'wont_fix' ? 'opacity-60' : ''}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize flex items-center w-max">
                        {getFeedbackTypeIcon(item.type)}
                        <span className="ml-1.5">{item.type.replace('_', ' ')}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate" title={item.subject}>{item.subject}</TableCell>
                    <TableCell className="text-xs">
                      {item.userName || 'Anonymous'}
                      {item.userEmail && <div className="text-muted-foreground truncate max-w-[180px]" title={item.userEmail}>{item.userEmail}</div>}
                      {item.userId && <div className="text-muted-foreground font-mono text-[10px] truncate max-w-[100px]" title={item.userId}>UID: {item.userId.substring(0,8)}...</div>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: true })}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{new Date(item.createdAt).toLocaleString()}</p>
                            {item.updatedAt && <p>Updated: {new Date(item.updatedAt).toLocaleString()}</p>}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                        <Select 
                            value={item.status || 'new'} 
                            onValueChange={(value) => handleStatusChange(item.id!, value as FeedbackSubmission['status'])}
                        >
                            <SelectTrigger className={`h-8 text-xs w-[120px] ${getStatusBadgeColorClass(item.status || 'new')} border-none`}>
                                <SelectValue/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="seen">Seen</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                                <SelectItem value="wont_fix">Won't Fix</SelectItem>
                            </SelectContent>
                        </Select>
                    </TableCell>
                     <TableCell className="text-xs text-muted-foreground">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <p className="line-clamp-2 cursor-help">{item.description}</p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" align="start" className="max-w-md p-2 bg-popover text-popover-foreground shadow-lg rounded-md border text-xs whitespace-pre-wrap">
                                    <p>{item.description}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
         <div className="p-4 border-t mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Further enhancements like ticket assignment and direct responses are planned for a future update.
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
