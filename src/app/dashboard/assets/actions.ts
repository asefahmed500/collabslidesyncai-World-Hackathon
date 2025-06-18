
"use server";

import { auth } from '@/lib/firebaseConfig';
import { createAssetMetadata, deleteAsset as deleteAssetFromDbAndStorage } from '@/lib/firestoreService';
import type { Asset } from '@/types';
import { revalidatePath } from 'next/cache';
import { getUserFromMongoDB } from '@/lib/mongoUserService'; // For fetching user profile if needed

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
    // Fetch uploader's name from MongoDB for denormalization
    const uploaderProfile = await getUserFromMongoDB(assetData.uploaderId);
    const dataWithUploaderName = {
        ...assetData,
        uploaderName: uploaderProfile?.name || 'Unknown User',
    };

    const newAssetId = await createAssetMetadata(dataWithUploaderName);
    
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
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return { success: false, message: 'Authentication required.' };
  }
  
  // Get user's AppUser profile from MongoDB to access teamId
  const userProfile = await getUserFromMongoDB(firebaseUser.uid);
  if (!userProfile || !userProfile.teamId) {
    return { success: false, message: 'User or team information not found for permission check.' };
  }

  // Permission check: In a real app, verify if user can delete this asset
  // (e.g., is team admin, or uploaded the asset, and asset belongs to their team)
  // For now, we assume if they can call this action, they have permission.
  // The deleteAsset service function will need teamId and actorId for logging.
  
  try {
    await deleteAssetFromDbAndStorage(assetId, storagePath, userProfile.teamId, firebaseUser.uid);
    revalidatePath('/dashboard/assets');
    return { success: true, message: 'Asset deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    return { success: false, message: error.message || 'Failed to delete asset.' };
  }
}
