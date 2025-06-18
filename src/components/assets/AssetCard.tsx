
"use client";

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Asset } from '@/types';
import { ImageIcon, FileText, Music, Video, Trash2, Download, Copy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface AssetCardProps {
  asset: Asset;
  onDelete: (asset: Asset) => void; // Pass the whole asset object for deletion
}

const getAssetIcon = (assetType: Asset['assetType']) => {
  switch (assetType) {
    case 'image': return <ImageIcon className="h-8 w-8 text-blue-500" />;
    case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
    case 'audio': return <Music className="h-8 w-8 text-purple-500" />;
    case 'video': return <Video className="h-8 w-8 text-orange-500" />;
    default: return <FileText className="h-8 w-8 text-gray-500" />;
  }
};

export function AssetCard({ asset, onDelete }: AssetCardProps) {
  const { toast } = useToast();

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(asset.downloadURL)
      .then(() => toast({ title: "URL Copied!", description: "Asset download URL copied to clipboard." }))
      .catch(err => toast({ title: "Copy Failed", description: "Could not copy URL.", variant: "destructive" }));
  };

  const createdAtDate = asset.createdAt instanceof Date ? asset.createdAt : (asset.createdAt as any)?.toDate();


  return (
    <Card className="flex flex-col h-full shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="p-4 border-b">
        {asset.assetType === 'image' && asset.thumbnailURL ? (
          <div className="aspect-video relative rounded-md overflow-hidden bg-muted">
            <Image 
                src={asset.thumbnailURL} 
                alt={asset.fileName} 
                layout="fill" 
                objectFit="contain" 
                data-ai-hint="asset thumbnail" 
            />
          </div>
        ) : (
          <div className="aspect-video flex items-center justify-center bg-muted rounded-md">
            {getAssetIcon(asset.assetType)}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="text-base font-semibold truncate mb-1" title={asset.fileName}>
          {asset.fileName}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Type: <Badge variant="outline" className="capitalize text-xs">{asset.assetType}</Badge> | Size: {(asset.size / 1024 / 1024).toFixed(2)} MB
        </CardDescription>
        <p className="text-xs text-muted-foreground mt-1">
          Uploaded {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'N/A'}
          {asset.uploaderName && ` by ${asset.uploaderName}`}
        </p>
        {asset.description && <p className="text-xs text-muted-foreground mt-1 truncate" title={asset.description}>Desc: {asset.description}</p>}
        {asset.tags && asset.tags.length > 0 && (
          <div className="mt-1.5 space-x-1">
            {asset.tags.slice(0,3).map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
            {asset.tags.length > 3 && <Badge variant="secondary" className="text-xs">+{asset.tags.length -3} more</Badge>}
          </div>
        )}
      </CardContent>
      <CardFooter className="p-3 border-t flex justify-end space-x-2">
         <Button variant="ghost" size="icon" onClick={handleCopyToClipboard} title="Copy URL">
            <Copy className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" asChild title="Download asset">
            <a href={asset.downloadURL} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
            </a>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(asset)} title="Delete asset">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardFooter>
    </Card>
  );
}
