
"use server";

import { auth } from '@/lib/firebaseConfig';
import { createAssetMetadata, deleteAsset as deleteAssetFromDbAndStorage } from '@/lib/firestoreService';
import type { Asset } from '@/types';
import { revalidatePath } from 'next/cache';

interface AssetActionResponse {
  success: boolean;
  message: string;
  asset?: Asset | null;
  assetId?: string;
}

export async function createAssetMetadataAction(
  assetData: Omit<Asset, 'id' | 'createdAt' | 'lastUpdatedAt'>
): Promise<AssetActionResponse> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== assetData.uploaderId) {
    return { success: false, message: 'Authentication required or mismatched uploader.' };
  }
  if (!assetData.teamId) {
    return { success: false, message: 'Team ID is required to create an asset.' };
  }

  try {
    const newAssetId = await createAssetMetadata({
        ...assetData,
        // Ensure createdAt is handled by Firestore service with serverTimestamp
    } as Omit<Asset, 'id' | 'createdAt' | 'lastUpdatedAt'>);
    
    revalidatePath('/dashboard/assets');
    // It's better to fetch the created asset to return it with server-generated timestamps
    // For simplicity now, we return success, client can re-fetch or use optimistic updates
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
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return { success: false, message: 'Authentication required.' };
  }
  
  // Permission check: In a real app, verify if user can delete this asset
  // (e.g., is team admin, or uploaded the asset, and asset belongs to their team)
  // For now, we assume if they can call this action, they have permission through UI controls.

  const userProfile = await (await import('@/lib/firestoreService')).getUserProfile(currentUser.uid);
  if (!userProfile || !userProfile.teamId) {
    return { success: false, message: 'User or team information not found.' };
  }

  try {
    await deleteAssetFromDbAndStorage(assetId, storagePath, userProfile.teamId, currentUser.uid);
    revalidatePath('/dashboard/assets');
    return { success: true, message: 'Asset deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    return { success: false, message: error.message || 'Failed to delete asset.' };
  }
}
