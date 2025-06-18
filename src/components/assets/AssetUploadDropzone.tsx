
"use client";

import { useState, useCallback } from 'react';
import { useDropzone, type FileWithPath } from 'react-dropzone';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage as fbStorage } from '@/lib/firebaseConfig'; 
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

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function AssetUploadDropzone({ teamId, uploaderId, uploaderName, onAssetUploaded }: AssetUploadDropzoneProps) {
  const [filesToUpload, setFilesToUpload] = useState<FileWithPath[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { toast } = useToast();

  const getAssetTypeFromFile = (file: FileWithPath): AssetType => {
    const mimeType = file.type;
    if (mimeType.startsWith('image/')) return 'image';
    // Future: Add video, audio, pdf checks
    return 'other';
  };

  const onDrop = useCallback((acceptedFiles: FileWithPath[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(rejectedFile => {
            rejectedFile.errors.forEach((error: any) => {
                if (error.code === 'file-too-large') {
                    toast({ title: "Upload Error", description: `File "${rejectedFile.file.name}" is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
                } else {
                    toast({ title: "Upload Error", description: `File "${rejectedFile.file.name}": ${error.message}`, variant: "destructive" });
                }
            });
        });
        setFilesToUpload([]);
        return;
    }

    if (acceptedFiles.length > 0) {
      setFilesToUpload([acceptedFiles[0]]); 
      setUploadError(null);
      setUploadProgress(null);
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    multiple: false, 
    maxSize: MAX_FILE_SIZE_BYTES,
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
          const assetType = getAssetTypeFromFile(file);
          
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
            // thumbnailURL and dimensions will be set for images
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
                // For images, full URL can be thumbnail. Could generate smaller one with Cloud Functions.
                assetMetadata.thumbnailURL = downloadURL; 
                URL.revokeObjectURL(img.src);
            } catch (e) { console.warn("Could not get image dimensions for", file.name); }
          }


          const result = await createAssetMetadataAction(assetMetadata);

          if (result.success && result.assetId) {
            toast({ title: "Upload Successful", description: `${file.name} has been uploaded.` });
            const newAssetForCallback: Asset = {
                ...assetMetadata,
                id: result.assetId,
                createdAt: new Date() as any, 
                thumbnailURL: assetMetadata.thumbnailURL || downloadURL, // Ensure thumbnail is passed
            };
            onAssetUploaded(newAssetForCallback);
            setFilesToUpload([]); 
          } else {
            throw new Error(result.message || "Failed to save asset metadata.");
          }
        } catch (error: any) {
          console.error("Error saving asset metadata:", error);
          setUploadError(`Metadata save failed: ${error.message}`);
          toast({ title: "Metadata Save Failed", description: error.message, variant: "destructive" });
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
          <p className="text-primary">Drop the image file here ...</p>
        ) : (
          <p className="text-muted-foreground">Drag & drop an image here, or click to select file</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">Supports: JPG, PNG, GIF, WEBP (Max {MAX_FILE_SIZE_MB}MB)</p>
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
