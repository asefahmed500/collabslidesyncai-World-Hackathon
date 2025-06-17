
"use client";

import { useState, useCallback } from 'react';
import { useDropzone, type FileWithPath } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage as fbStorage } from '@/lib/firebaseConfig'; // Ensure storage is exported from firebaseConfig
import { createAssetMetadataAction } from '@/app/dashboard/assets/actions';
import type { Asset, AssetType } from '@/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, FileImage, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Image from 'next/image';

interface AssetUploadDropzoneProps {
  teamId: string;
  uploaderId: string;
  uploaderName: string;
  onAssetUploaded: (asset: Asset) => void;
}

export function AssetUploadDropzone({ teamId, uploaderId, uploaderName, onAssetUploaded }: AssetUploadDropzoneProps) {
  const [filesToUpload, setFilesToUpload] = useState<FileWithPath[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();

  const getAssetType = (mimeType: string): AssetType => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType === 'application/pdf') return 'pdf';
    return 'other';
  };

  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    // For now, let's handle one file at a time to simplify UI for progress/error
    if (acceptedFiles.length > 0) {
      setFilesToUpload([acceptedFiles[0]]); // Replace current selection
      setUploadError(null);
      setUploadProgress(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      // 'application/pdf': ['.pdf'],
      // 'video/*': ['.mp4', '.mov', '.avi'],
      // 'audio/*': ['.mp3', '.wav']
    },
    multiple: false, // Handle one file at a time for now
  });

  const handleUpload = async () => {
    if (filesToUpload.length === 0) {
      toast({ title: "No file selected", description: "Please select a file to upload.", variant: "destructive" });
      return;
    }
    const file = filesToUpload[0];
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const storagePath = `assets/${teamId}/${uploaderId}/${Date.now()}_${file.name}`;
    const storageRef = ref(fbStorage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error("Upload failed:", error);
        setUploadError(`Upload failed: ${error.message}`);
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        setIsUploading(false);
        setUploadProgress(null);
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const assetType = getAssetType(file.type);
          
          const assetMetadata: Omit<Asset, 'id' | 'createdAt' | 'lastUpdatedAt'> = {
            teamId,
            uploaderId,
            uploaderName,
            fileName: file.name,
            fileType: file.type,
            assetType,
            storagePath,
            downloadURL,
            size: file.size,
          };
          
          if (assetType === 'image') {
            try {
                const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                    const image = new window.Image();
                    image.onload = () => resolve(image);
                    image.onerror = reject;
                    image.src = URL.createObjectURL(file);
                });
                assetMetadata.dimensions = { width: img.width, height: img.height };
                assetMetadata.thumbnailURL = downloadURL; // For images, full URL can be thumbnail
                URL.revokeObjectURL(img.src);
            } catch (e) { console.warn("Could not get image dimensions for", file.name); }
          }


          const result = await createAssetMetadataAction(assetMetadata);

          if (result.success && result.assetId) {
            toast({ title: "Upload Successful", description: `${file.name} has been uploaded.` });
            // Construct a temporary Asset object to pass to onAssetUploaded for immediate UI update
            const newAsset: Asset = {
                ...assetMetadata,
                id: result.assetId,
                createdAt: new Date() as any, // Placeholder, Firestore service sets serverTimestamp
            };
            onAssetUploaded(newAsset);
            setFilesToUpload([]); // Clear selection
          } else {
            throw new Error(result.message || "Failed to save asset metadata.");
          }
        } catch (error: any) {
          console.error("Error saving asset metadata:", error);
          setUploadError(`Metadata save failed: ${error.message}`);
          toast({ title: "Metadata Save Failed", description: error.message, variant: "destructive" });
           // TODO: Consider deleting the uploaded file from storage if metadata fails
        } finally {
          setIsUploading(false);
          setUploadProgress(null);
        }
      }
    );
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary transition-colors
                    ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/50'}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        {isDragActive ? (
          <p className="text-primary">Drop the file here ...</p>
        ) : (
          <p className="text-muted-foreground">Drag & drop an image here, or click to select file</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Supports: JPG, PNG, GIF, WEBP (Max 5MB)</p>
      </div>

      {filesToUpload.length > 0 && (
        <div className="p-3 border rounded-md bg-muted/50">
          <h4 className="font-medium text-sm mb-2">Selected file:</h4>
          {filesToUpload.map(file => (
            <div key={file.path} className="flex items-center justify-between text-sm">
              <div className='flex items-center gap-2'>
                <FileImage className="h-5 w-5 text-primary" />
                <span>{file.path} - {(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
               <Button variant="ghost" size="sm" onClick={() => setFilesToUpload([])} title="Clear selection">
                  <XCircle className="h-4 w-4 text-destructive"/>
               </Button>
            </div>
          ))}
        </div>
      )}

      {uploadProgress !== null && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="w-full h-2" />
          <p className="text-xs text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
        </div>
      )}

      {uploadError && <p className="text-sm text-destructive text-center">{uploadError}</p>}
      
      {!isUploading && filesToUpload.length > 0 && (
        <Button onClick={handleUpload} disabled={isUploading || filesToUpload.length === 0} className="w-full">
          <UploadCloud className="mr-2 h-4 w-4" /> Upload Selected File
        </Button>
      )}
      {isUploading && (
        <Button disabled className="w-full">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
        </Button>
      )}
    </div>
  );
}
