
"use client";

import { useEffect, useState } from 'react';
import type { Presentation, User as AppUser } from '@/types';
import { getAllPresentationsForAdmin, deletePresentation as apiDeletePresentation } from '@/lib/firestoreService'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Edit, Trash2, Eye, UserCircle, LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth'; // To get current admin user for actions
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
} from "@/components/ui/alert-dialog";

export default function AdminAllPresentationsPage() {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const router = useRouter();
  const [presentationToDelete, setPresentationToDelete] = useState<Presentation | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getAllPresentationsForAdmin()
      .then(setPresentations)
      .catch(error => {
        console.error("Error fetching all presentations:", error);
        toast({ title: "Error", description: "Could not fetch presentations.", variant: "destructive" });
      })
      .finally(() => setIsLoading(false));
  }, [toast]);

  const handleDeletePresentation = async () => {
    if (!presentationToDelete || !currentUser || !currentUser.isAppAdmin) return;
    try {
      await apiDeletePresentation(presentationToDelete.id, presentationToDelete.teamId, currentUser.id);
      toast({ title: "Presentation Deleted", description: `"${presentationToDelete.title}" has been removed.` });
      setPresentations(prev => prev.filter(p => p.id !== presentationToDelete.id));
    } catch (error: any) {
      console.error("Error deleting presentation by admin:", error);
      toast({ title: "Error", description: error.message || "Could not delete presentation.", variant: "destructive" });
    } finally {
      setPresentationToDelete(null);
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
      <CardHeader>
        <CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5"/> All Presentations ({presentations.length})</CardTitle>
        <CardDescription>Browse and manage all presentations in the system.</CardDescription>
      </CardHeader>
      <CardContent>
        {presentations.length === 0 ? (
          <p className="text-muted-foreground text-center">No presentations found in the system.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Creator ID</TableHead>
                <TableHead>Team ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentations.map((pres) => (
                <TableRow key={pres.id}>
                  <TableCell>
                     <Link href={`/editor/${pres.id}`} className="font-medium hover:text-primary hover:underline" title={pres.title}>
                        {pres.title.length > 30 ? `${pres.title.substring(0,27)}...` : pres.title}
                     </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{pres.creatorId.substring(0,12)}...</TableCell>
                  <TableCell className="font-mono text-xs">{pres.teamId || 'N/A'}</TableCell>
                  <TableCell>
                    {pres.settings.isPublic ? <Badge variant="secondary"><Eye className="mr-1 h-3 w-3"/>Public</Badge> : <Badge variant="outline">Private</Badge>}
                     {pres.settings.passwordProtected && <Badge variant="outline" className="ml-1">Pass</Badge>}
                  </TableCell>
                  <TableCell>
                    {pres.lastUpdatedAt ? format(new Date(pres.lastUpdatedAt.toDate ? pres.lastUpdatedAt.toDate() : pres.lastUpdatedAt), 'PPp') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild title="Open in Editor">
                       <Link href={`/editor/${pres.id}`}><Edit className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild title="View Presentation">
                        <Link href={`/present/${pres.id}`} target="_blank"><LinkIcon className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setPresentationToDelete(pres)} title="Delete Presentation">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
       {presentationToDelete && (
        <AlertDialog open={!!presentationToDelete} onOpenChange={(open) => !open && setPresentationToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive"/>Delete "{presentationToDelete.title}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the presentation from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPresentationToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePresentation} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Confirm Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
