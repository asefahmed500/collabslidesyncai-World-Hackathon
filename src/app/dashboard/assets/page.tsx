
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { AssetUploadDropzone } from '@/components/assets/AssetUploadDropzone';
import { AssetCard } from '@/components/assets/AssetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Library, FileWarning, ShieldAlert, Trash2 } from 'lucide-react';
import type { Asset } from '@/types';
import { getTeamAssets, deleteAsset as apiDeleteAsset } from '@/lib/firestoreService';
import { useToast } from '@/hooks/use-toast';
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

export default function AssetLibraryPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!currentUser || !currentUser.teamId) return;
    setIsLoading(true);
    try {
      const teamAssets = await getTeamAssets(currentUser.teamId);
      setAssets(teamAssets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast({ title: "Error", description: "Could not fetch team assets.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    } else if (!authLoading && currentUser && !currentUser.teamId) {
      toast({ title: "No Team", description: "You must be part of a team to access the asset library.", variant: "destructive" });
      router.push('/dashboard');
    } else if (currentUser?.teamId) {
      fetchAssets();
    }
  }, [currentUser, authLoading, router, toast, fetchAssets]);

  const handleAssetUploaded = (newAsset: Asset) => {
    setAssets(prevAssets => [newAsset, ...prevAssets]);
    fetchAssets(); // Re-fetch to ensure correct sorting and any server-side updates
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete || !currentUser || !currentUser.teamId) return;
    try {
      await apiDeleteAsset(assetToDelete.id, assetToDelete.storagePath, currentUser.teamId, currentUser.id);
      setAssets(prev => prev.filter(asset => asset.id !== assetToDelete.id));
      toast({ title: "Asset Deleted", description: `${assetToDelete.fileName} has been removed.` });
    } catch (error: any) {
      console.error("Error deleting asset:", error);
      toast({ title: "Error", description: error.message || "Could not delete asset.", variant: "destructive" });
    } finally {
      setAssetToDelete(null);
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading || (isLoading && currentUser && currentUser.teamId)) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!currentUser) {
     return <div className="flex min-h-screen flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!currentUser.teamId) {
    return (
      <div className="flex flex-col min-h-screen">
        <SiteHeader />
        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center text-center">
          <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
          <h1 className="font-headline text-3xl font-bold mb-2">Team Required</h1>
          <p className="text-muted-foreground">You need to be part of a team to access the Asset Library.</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-6">Go to Dashboard</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary flex items-center">
            <Library className="mr-3 h-10 w-10" /> Team Asset Library
          </h1>
          <p className="text-muted-foreground">Manage your team's shared images and other files.</p>
        </div>

        <Card className="mb-8 shadow-lg">
          <CardHeader>
            <CardTitle>Upload New Asset</CardTitle>
            <CardDescription>Add images to your team's library. Other file types support coming soon.</CardDescription>
          </CardHeader>
          <CardContent>
            <AssetUploadDropzone 
              teamId={currentUser.teamId} 
              uploaderId={currentUser.id}
              uploaderName={currentUser.name || 'Anonymous'}
              onAssetUploaded={handleAssetUploaded} 
            />
            <p className="text-xs text-muted-foreground mt-2">
              Note: Ensure your Firebase Storage rules allow writes for authenticated users (e.g., `allow write: if request.auth != null;` for path `assets/{teamId}/{userId}/{fileName}`).
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Team Assets ({filteredAssets.length})</CardTitle>
              <CardDescription>Browse and manage your uploaded assets.</CardDescription>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by filename or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}
            {!isLoading && filteredAssets.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileWarning className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-muted-foreground">
                  {assets.length === 0 ? "No assets in your library yet." : "No assets match your search."}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {assets.length === 0 ? "Upload some files to get started!" : "Try a different search term or clear the search."}
                </p>
                {assets.length > 0 && searchTerm && (
                    <Button variant="outline" className="mt-4" onClick={() => setSearchTerm('')}>Clear Search</Button>
                )}
              </div>
            )}
            {!isLoading && filteredAssets.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredAssets.map(asset => (
                  <AssetCard 
                    key={asset.id} 
                    asset={asset} 
                    onDelete={() => setAssetToDelete(asset)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        © {new Date().getFullYear()} CollabSlideSyncAI.
      </footer>

      {assetToDelete && (
        <AlertDialog open={!!assetToDelete} onOpenChange={(open) => !open && setAssetToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center"><Trash2 className="mr-2 h-5 w-5 text-destructive"/>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the asset "{assetToDelete.fileName}" from your library and Firebase Storage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAssetToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAsset} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete Asset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
