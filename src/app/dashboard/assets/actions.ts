
"use server";

import { auth } from '@/lib/firebaseConfig';
import { createAssetMetadata, deleteAsset as deleteAssetFromDbAndStorage } from '@/lib/firestoreService';
import type { Asset } from '@/types';
import { revalidatePath } from 'next/cache';
import { getUserFromMongoDB } from '@/lib/mongoUserService'; 

interface AssetActionResponse {
  success: boolean;
  message: string;
  asset?: Asset | null;
  assetId?: string;
}

export async function createAssetMetadataAction(
  assetData: Omit<Asset, 'id' | 'createdAt' | 'lastUpdatedAt'>
): Promise<AssetActionResponse> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.uid !== assetData.uploaderId) {
    return { success: false, message: 'Authentication required or mismatched uploader.' };
  }
  if (!assetData.teamId) {
    return { success: false, message: 'Team ID is required to create an asset.' };
  }

  try {
    const uploaderProfile = await getUserFromMongoDB(assetData.uploaderId);
    const dataWithDefaults: Omit<Asset, 'id' | 'createdAt' | 'lastUpdatedAt'> = {
        ...assetData,
        uploaderName: uploaderProfile?.name || 'Unknown User',
        thumbnailURL: assetData.assetType === 'image' ? assetData.downloadURL : undefined, // Default thumbnail for images
        // Ensure dimensions is either set or undefined, not null
        dimensions: assetData.dimensions ? assetData.dimensions : undefined,
    };

    const newAssetId = await createAssetMetadata(dataWithDefaults);
    
    revalidatePath('/dashboard/assets');
    return { success: true, message: 'Asset metadata created successfully.', assetId: newAssetId };
  } catch (error: any) {
    console.error("Error creating asset metadata:", error);
    return { success: false, message: error.message || 'Failed to create asset metadata.' };
  }
}

export async function deleteAssetAction(
  assetId: string,
  storagePath: string
): Promise<Omit<AssetActionResponse, 'asset'>> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return { success: false, message: 'Authentication required.' };
  }
  
  const userProfile = await getUserFromMongoDB(firebaseUser.uid);
  if (!userProfile || !userProfile.teamId) {
    return { success: false, message: 'User or team information not found for permission check.' };
  }
  
  try {
    await deleteAssetFromDbAndStorage(assetId, storagePath, userProfile.teamId, firebaseUser.uid);
    revalidatePath('/dashboard/assets');
    return { success: true, message: 'Asset deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    return { success: false, message: error.message || 'Failed to delete asset.' };
  }
}
