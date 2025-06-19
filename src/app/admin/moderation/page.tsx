
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Presentation, PresentationModerationStatus } from '@/types';
import { getPresentationsForModerationReview } from '@/lib/firestoreService'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ShieldAlert, Eye, CheckCircle, XCircle, Edit3, FileWarning, ShieldQuestion, AlertTriangle } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; 
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label'; // Added Label import
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Added Select imports


export default function AdminContentModerationPage() {
  const [reviewQueue, setReviewQueue] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'take_down' | 'edit_notes' | null>(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const fetchReviewQueue = useCallback(async () => {
    setIsLoading(true);
    try {
      const presentations = await getPresentationsForModerationReview();
      setReviewQueue(presentations);
    } catch (error) {
      console.error("Error fetching presentations for moderation:", error);
      toast({ title: "Error", description: "Could not fetch moderation queue.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser?.isAppAdmin) {
      fetchReviewQueue();
    }
  }, [currentUser, fetchReviewQueue]);

  const handleAction = async () => {
    if (!selectedPresentation || !actionType || !currentUser?.isAppAdmin) return;

    let newStatus: PresentationModerationStatus | undefined = undefined;
    if (actionType === 'approve') newStatus = 'active';
    if (actionType === 'take_down') newStatus = 'taken_down';
    
    if (!newStatus && actionType !== 'edit_notes') {
        toast({title: "Invalid Action", description: "No valid action specified.", variant: "destructive"});
        return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/admin/presentations/${selectedPresentation.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            status: newStatus, 
            notes: moderationNotes || selectedPresentation.moderationNotes, 
            actorUserId: currentUser.id 
        }),
      });
      const result = await response.json();

      if (result.success) {
        toast({ title: "Moderation Action Successful", description: result.message });
        fetchReviewQueue(); // Refresh the queue
      } else {
        toast({ title: "Action Failed", description: result.message, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Could not perform moderation action.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setSelectedPresentation(null);
      setActionType(null);
      setModerationNotes('');
    }
  };

  const openActionDialog = (presentation: Presentation, type: 'approve' | 'take_down' | 'edit_notes') => {
    setSelectedPresentation(presentation);
    setActionType(type);
    setModerationNotes(presentation.moderationNotes || '');
  };

  const getDialogDetails = () => {
    if (!selectedPresentation || !actionType) return { title: "", description: "", actionText: "" };
    switch (actionType) {
      case 'approve':
        return { title: `Approve "${selectedPresentation.title}"?`, description: "This will set the presentation status to 'active' and make it publicly available if its sharing settings permit.", actionText: "Approve Presentation" };
      case 'take_down':
        return { title: `Take Down "${selectedPresentation.title}"?`, description: "This will make the presentation inaccessible to regular users. Add notes for context.", actionText: "Take Down Presentation" };
      case 'edit_notes':
        return { title: `Edit Moderation Notes for "${selectedPresentation.title}"`, description: "Update the internal moderation notes for this presentation. Current status will be maintained unless changed here.", actionText: "Save Notes & Status"};
      default:
        return { title: "", description: "", actionText: "" };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><ShieldAlert className="mr-2 h-6 w-6 text-orange-500" /> Content Moderation Queue</CardTitle>
          <CardDescription>Loading presentations under review...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ShieldAlert className="mr-2 h-6 w-6 text-orange-500" /> Content Moderation Queue ({reviewQueue.length})
        </CardTitle>
        <CardDescription>
          Review presentations flagged as 'under_review'. Approve them or take them down.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reviewQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/30">
            <FileWarning className="h-16 w-16 text-muted-foreground mb-3" />
            <p className="text-lg font-semibold text-muted-foreground">No presentations currently require review.</p>
            <p className="text-sm text-muted-foreground">Presentations set to 'under_review' will appear here.</p>
             <Button variant="outline" className="mt-4" asChild>
                <Link href="/admin/presentations">View All Presentations</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Creator ID</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Current Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewQueue.map((pres) => (
                <TableRow key={pres.id}>
                  <TableCell className="font-medium max-w-xs truncate" title={pres.title}>
                    <Link href={`/editor/${pres.id}`} target="_blank" className="hover:underline text-primary">
                      {pres.title}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{pres.creatorId.substring(0,12)}...</TableCell>
                  <TableCell className="text-xs">
                    {pres.lastUpdatedAt ? formatDistanceToNowStrict(new Date(pres.lastUpdatedAt.toDate ? pres.lastUpdatedAt.toDate() : pres.lastUpdatedAt), { addSuffix: true }) : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-sm truncate" title={pres.moderationNotes}>
                    {pres.moderationNotes || <span className="italic">No notes</span>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => openActionDialog(pres, 'approve')} title="Approve Presentation">
                      <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Approve
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openActionDialog(pres, 'take_down')} title="Take Down Presentation">
                      <XCircle className="h-4 w-4 mr-1 text-destructive" /> Take Down
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openActionDialog(pres, 'edit_notes')} title="Edit Moderation Notes">
                      <Edit3 className="h-4 w-4 mr-1 text-blue-600" /> Edit Notes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {selectedPresentation && actionType && (
        <Dialog open={!!selectedPresentation} onOpenChange={(open) => !open && setSelectedPresentation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                {actionType === 'approve' && <CheckCircle className="mr-2 h-5 w-5 text-green-600"/>}
                {actionType === 'take_down' && <XCircle className="mr-2 h-5 w-5 text-destructive"/>}
                {actionType === 'edit_notes' && <Edit3 className="mr-2 h-5 w-5 text-blue-600"/>}
                {getDialogDetails().title}
              </DialogTitle>
              <DialogDescription>
                {getDialogDetails().description}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
                {(actionType === 'take_down' || actionType === 'edit_notes') && (
                    <div>
                        <Label htmlFor="moderationNotesTextarea">Moderation Notes (Optional for Approve, Recommended for Take Down)</Label>
                        <Textarea
                            id="moderationNotesTextarea"
                            value={moderationNotes}
                            onChange={(e) => setModerationNotes(e.target.value)}
                            placeholder={actionType === 'take_down' ? "Reason for taking down..." : "Add or update notes..."}
                            rows={3}
                            className="mt-1"
                        />
                    </div>
                )}
                 {actionType === 'edit_notes' && selectedPresentation && (
                     <div>
                        <Label htmlFor="newStatusSelect">Change Status (Optional)</Label>
                        <Select 
                            defaultValue={selectedPresentation.moderationStatus}
                            onValueChange={(value) => {
                                // This is tricky with a single 'handleAction'.
                                // For simplicity, we'll keep the main actionType, and if status changes here,
                                // the 'handleAction' will use this new status.
                                // A more complex setup would have separate state for newStatus in this dialog.
                                if(value === 'active') setActionType('approve');
                                else if (value === 'taken_down') setActionType('take_down');
                                // else 'under_review' means no status change for this specific 'Save Notes' path if it was already under review
                            }}
                        >
                            <SelectTrigger id="newStatusSelect" className="mt-1">
                                <SelectValue placeholder="Keep current status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="under_review">Keep as 'Under Review'</SelectItem>
                                <SelectItem value="active">Change to 'Active'</SelectItem>
                                <SelectItem value="taken_down">Change to 'Taken Down'</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                 )}

            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {setSelectedPresentation(null); setActionType(null);}} disabled={isSubmitting}>Cancel</Button>
              <Button 
                onClick={handleAction} 
                disabled={isSubmitting}
                className={actionType === 'take_down' ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : (actionType === 'approve' ? "bg-green-600 hover:bg-green-700 text-white" : "")}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : getDialogDetails().actionText}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
       <div className="p-6 border-t mt-6">
            <h3 className="text-lg font-semibold mb-2">Other Moderation Tools</h3>
            <p className="text-sm text-muted-foreground mb-3">
                For more granular control over all presentations (including those not under review),
                use the main presentations management page.
            </p>
            <Button asChild variant="secondary">
                <Link href="/admin/presentations">Go to All Presentations</Link>
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
                Future enhancements will include automated content scanning and reporting features to populate this queue.
            </p>
        </div>
    </Card>
  );
}
