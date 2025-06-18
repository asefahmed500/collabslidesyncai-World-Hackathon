
"use client";

import { useEffect, useState, useCallback } from 'react';
import type { Presentation, PresentationModerationStatus } from '@/types';
import { 
  getAllPresentationsForAdmin, 
  deletePresentation as apiSoftDeletePresentation,
  restorePresentation as apiRestorePresentation,
  permanentlyDeletePresentation as apiPermanentlyDeletePresentation,
  updatePresentationModerationStatus // New service
} from '@/lib/firestoreService'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Edit, Trash2, Eye, LinkIcon, Search, RotateCcw, AlertTriangle, ShieldCheck, ShieldX, ShieldQuestion } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; 
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';


type ActionType = 'delete' | 'restore' | 'permanentlyDelete' | 'changeModeration';

export default function AdminAllPresentationsPage() {
  const [allPresentations, setAllPresentations] = useState<Presentation[]>([]);
  const [filteredPresentations, setFilteredPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerIdFilter, setOwnerIdFilter] = useState('');
  const [teamIdFilter, setTeamIdFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);

  const [presentationToAction, setPresentationToAction] = useState<Presentation | null>(null);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [isModerationDialogOpen, setIsModerationDialogOpen] = useState(false);
  const [currentModerationStatus, setCurrentModerationStatus] = useState<PresentationModerationStatus>('active');
  const [moderationNotes, setModerationNotes] = useState('');


  const fetchPresentations = useCallback(async () => {
    setIsLoading(true);
    try {
      const presentationsData = await getAllPresentationsForAdmin(showDeleted);
      setAllPresentations(presentationsData);
    } catch (error) {
      console.error("Error fetching presentations:", error);
      toast({ title: "Error", description: "Could not fetch presentations.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, showDeleted]);

  useEffect(() => {
    fetchPresentations();
  }, [fetchPresentations]);

  useEffect(() => {
    let tempPresentations = allPresentations;
    if (searchTerm) {
      tempPresentations = tempPresentations.filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (ownerIdFilter) {
      tempPresentations = tempPresentations.filter(p => p.creatorId.toLowerCase().includes(ownerIdFilter.toLowerCase()));
    }
    if (teamIdFilter) {
      tempPresentations = tempPresentations.filter(p => p.teamId && p.teamId.toLowerCase().includes(teamIdFilter.toLowerCase()));
    }
    setFilteredPresentations(tempPresentations);
  }, [searchTerm, ownerIdFilter, teamIdFilter, allPresentations]);


  const handleActionConfirm = async () => {
    if (!presentationToAction || !actionType || !currentUser || !currentUser.isAppAdmin) return;
    
    setIsLoading(true); 
    try {
      let message = "";
      if (actionType === 'delete') {
        await apiSoftDeletePresentation(presentationToAction.id, presentationToAction.teamId, currentUser.id);
        message = `"${presentationToAction.title}" has been soft-deleted.`;
      } else if (actionType === 'restore') {
        await apiRestorePresentation(presentationToAction.id, currentUser.id);
        message = `"${presentationToAction.title}" has been restored.`;
      } else if (actionType === 'permanentlyDelete') {
        await apiPermanentlyDeletePresentation(presentationToAction.id, currentUser.id);
        message = `"${presentationToAction.title}" has been permanently deleted.`;
      }
      toast({ title: "Action Successful", description: message });
      fetchPresentations(); 
    } catch (error: any) {
      console.error(`Error performing ${actionType} on presentation:`, error);
      toast({ title: "Error", description: error.message || `Could not perform ${actionType} action.`, variant: "destructive" });
    } finally {
      setPresentationToAction(null);
      setActionType(null);
      setIsLoading(false);
    }
  };

  const handleChangeModerationStatus = async () => {
    if (!presentationToAction || !currentUser || !currentUser.isAppAdmin) return;
    setIsLoading(true);
    try {
      await updatePresentationModerationStatus(presentationToAction.id, currentModerationStatus, currentUser.id, moderationNotes);
      toast({ title: "Moderation Status Updated", description: `Status for "${presentationToAction.title}" changed to ${currentModerationStatus}.` });
      setIsModerationDialogOpen(false);
      fetchPresentations(); // Refresh list
    } catch (error: any) {
      console.error("Error updating moderation status:", error);
      toast({ title: "Error", description: error.message || "Could not update moderation status.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  const openModerationDialog = (pres: Presentation) => {
    setPresentationToAction(pres);
    setCurrentModerationStatus(pres.moderationStatus || 'active');
    setModerationNotes(pres.moderationNotes || '');
    setIsModerationDialogOpen(true);
  };

  const getDialogDetails = () => {
    if (!presentationToAction || !actionType) return { title: "", description: "", actionText: "" };
    switch (actionType) {
      case 'delete':
        return { title: `Soft Delete "${presentationToAction.title}"?`, description: "This will mark the presentation as deleted, hiding it from regular views. It can be restored later.", actionText: "Soft Delete" };
      case 'restore':
        return { title: `Restore "${presentationToAction.title}"?`, description: "This will make the presentation active and visible again.", actionText: "Restore" };
      case 'permanentlyDelete':
        return { title: `Permanently Delete "${presentationToAction.title}"?`, description: "This action cannot be undone. All data for this presentation will be permanently removed.", actionText: "Permanently Delete" };
      default:
        return { title: "", description: "", actionText: "" };
    }
  };


  if (isLoading && allPresentations.length === 0) { 
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const getModerationStatusBadge = (status: PresentationModerationStatus) => {
    switch (status) {
      case 'active': return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300"><ShieldCheck className="mr-1 h-3 w-3"/>Active</Badge>;
      case 'under_review': return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-400"><ShieldQuestion className="mr-1 h-3 w-3"/>Under Review</Badge>;
      case 'taken_down': return <Badge variant="destructive"><ShieldX className="mr-1 h-3 w-3"/>Taken Down</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
                <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5"/> 
                {showDeleted ? "Deleted Presentations" : "All Active Presentations"} ({filteredPresentations.length})
                </CardTitle>
                <CardDescription>Browse and manage presentations in the system. Use filters to narrow down results.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="show-deleted-switch" className="text-sm font-medium">Show Deleted</Label>
                <Switch
                    id="show-deleted-switch"
                    checked={showDeleted}
                    onCheckedChange={(checked) => {
                        setShowDeleted(checked);
                        // Fetching will be triggered by useEffect dependency on showDeleted
                    }}
                />
            </div>
        </div>
         <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1 border-t pt-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by title, description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <Input
                type="text"
                placeholder="Filter by Owner ID..."
                value={ownerIdFilter}
                onChange={(e) => setOwnerIdFilter(e.target.value)}
            />
            <Input
                type="text"
                placeholder="Filter by Team ID..."
                value={teamIdFilter}
                onChange={(e) => setTeamIdFilter(e.target.value)}
            />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="flex justify-center py-4"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}
        {!isLoading && filteredPresentations.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            {searchTerm || ownerIdFilter || teamIdFilter ? "No presentations match your current filters." : 
             showDeleted ? "No deleted presentations found." : "No active presentations found."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Creator ID</TableHead>
                <TableHead>Team ID</TableHead>
                <TableHead>Access</TableHead>
                <TableHead>Moderation</TableHead>
                <TableHead>{showDeleted ? "Deleted At" : "Last Updated"}</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPresentations.map((pres) => (
                <TableRow key={pres.id} className={pres.deleted ? "opacity-60 bg-muted/30" : pres.moderationStatus === 'taken_down' ? 'opacity-50 bg-red-50' : ''}>
                  <TableCell>
                     <Link href={`/editor/${pres.id}`} className="font-medium hover:text-primary hover:underline" title={pres.title}>
                        {pres.title.length > 30 ? `${pres.title.substring(0,27)}...` : pres.title}
                     </Link>
                     {pres.deleted && <Badge variant="destructive" className="ml-2 text-xs">Deleted</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{pres.creatorId.substring(0,12)}...</TableCell>
                  <TableCell className="font-mono text-xs">{pres.teamId || 'N/A'}</TableCell>
                  <TableCell>
                    {pres.settings.isPublic ? <Badge variant="secondary"><Eye className="mr-1 h-3 w-3"/>Public</Badge> : <Badge variant="outline">Private</Badge>}
                     {pres.settings.passwordProtected && <Badge variant="outline" className="ml-1">Pass</Badge>}
                  </TableCell>
                  <TableCell>{getModerationStatusBadge(pres.moderationStatus || 'active')}</TableCell>
                  <TableCell className="text-xs">
                    {showDeleted && pres.deletedAt ? format(new Date(pres.deletedAt.toDate ? pres.deletedAt.toDate() : pres.deletedAt), 'PPp') 
                     : pres.lastUpdatedAt ? format(new Date(pres.lastUpdatedAt.toDate ? pres.lastUpdatedAt.toDate() : pres.lastUpdatedAt), 'PPp') 
                     : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {showDeleted ? (
                        <>
                        <Button variant="ghost" size="sm" onClick={() => { setPresentationToAction(pres); setActionType('restore');}} title="Restore Presentation">
                            <RotateCcw className="h-4 w-4 mr-1 text-green-600" /> Restore
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setPresentationToAction(pres); setActionType('permanentlyDelete');}} title="Permanently Delete">
                            <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete Forever
                        </Button>
                        </>
                    ) : (
                        <>
                        <Button variant="ghost" size="icon" asChild title="Open in Editor">
                           <Link href={`/editor/${pres.id}`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="View Presentation">
                            <Link href={`/present/${pres.id}`} target="_blank"><LinkIcon className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openModerationDialog(pres)} title="Change Moderation Status">
                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setPresentationToAction(pres); setActionType('delete');}} title="Soft Delete Presentation">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
       {presentationToAction && (actionType === 'delete' || actionType === 'restore' || actionType === 'permanentlyDelete') && (
        <AlertDialog open={!!presentationToAction} onOpenChange={(open) => !open && setPresentationToAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                {actionType === 'delete' && <Trash2 className="mr-2 h-5 w-5 text-destructive"/>}
                {actionType === 'restore' && <RotateCcw className="mr-2 h-5 w-5 text-green-600"/>}
                {actionType === 'permanentlyDelete' && <AlertTriangle className="mr-2 h-5 w-5 text-destructive"/>}
                {getDialogDetails().title}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {getDialogDetails().description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setPresentationToAction(null); setActionType(null);}} disabled={isLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleActionConfirm} 
                disabled={isLoading}
                className={actionType === 'delete' || actionType === 'permanentlyDelete' ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : getDialogDetails().actionText}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <Dialog open={isModerationDialogOpen} onOpenChange={setIsModerationDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Change Moderation Status for "{presentationToAction?.title}"</DialogTitle>
                <DialogDescription>Select a new status and add notes if necessary.</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <Label htmlFor="moderationStatusSelect">Status</Label>
                    <Select value={currentModerationStatus} onValueChange={(value) => setCurrentModerationStatus(value as PresentationModerationStatus)}>
                        <SelectTrigger id="moderationStatusSelect">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="under_review">Under Review</SelectItem>
                            <SelectItem value="taken_down">Taken Down</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div>
                    <Label htmlFor="moderationNotesText">Notes (Optional)</Label>
                    <Textarea 
                        id="moderationNotesText"
                        value={moderationNotes}
                        onChange={(e) => setModerationNotes(e.target.value)}
                        placeholder="Reason for status change, details..."
                        rows={3}
                    />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsModerationDialogOpen(false)} disabled={isLoading}>Cancel</Button>
                <Button onClick={handleChangeModerationStatus} disabled={isLoading}>
                     {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Save Status"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

    