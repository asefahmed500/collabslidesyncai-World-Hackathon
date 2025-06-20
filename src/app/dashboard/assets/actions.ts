
"use server";

import { auth } from '@/lib/firebaseConfig';
import { createAssetMetadata as createAssetMetadataFirestore, deleteAssetPure, logPresentationActivity } from '@/lib/firestoreService'; // Renamed deleteAsset import
import type { Asset } from '@/types';
import { revalidatePath } from 'next/cache';
import { getUserFromMongoDB } from '@/lib/mongoUserService'; 
import { logTeamActivityInMongoDB } from '@/lib/mongoTeamService'; // Import for logging

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
        thumbnailURL: assetData.assetType === 'image' ? assetData.downloadURL : undefined, 
        dimensions: assetData.dimensions ? assetData.dimensions : undefined,
    };

    const newAssetId = await createAssetMetadataFirestore(dataWithDefaults);
    
    // Log to MongoDB Team Activity
    if (assetData.teamId && assetData.uploaderId) {
      await logTeamActivityInMongoDB(assetData.teamId, assetData.uploaderId, 'asset_uploaded', { fileName: assetData.fileName, assetType: assetData.assetType }, 'asset', newAssetId);
    }

    revalidatePath('/dashboard/assets');
    return { success: true, message: 'Asset metadata created successfully.', assetId: newAssetId };
  } catch (error: any) {
    console.error("Error creating asset metadata:", error);
    return { success: false, message: error.message || 'Failed to create asset metadata.' };
  }
}

export async function deleteAssetAction(
  assetId: string,
  storagePath: string,
  teamId: string, // Added teamId parameter
  fileName: string, // Added fileName for logging
  assetType: Asset['assetType'] // Added assetType for logging
): Promise<Omit<AssetActionResponse, 'asset'>> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return { success: false, message: 'Authentication required.' };
  }
  
  // Permission check: Ensure the user is part of the team or has rights to delete.
  // This is simplified here; a real app might check specific roles.
  const userProfile = await getUserFromMongoDB(firebaseUser.uid);
  if (!userProfile || userProfile.teamId !== teamId) {
    return { success: false, message: 'You do not have permission to delete this asset or team information mismatch.' };
  }
  
  try {
    await deleteAssetPure(assetId, storagePath); // Use the renamed Firestore-only function

    // Log to MongoDB Team Activity
    await logTeamActivityInMongoDB(teamId, firebaseUser.uid, 'asset_deleted', { fileName, assetType }, 'asset', assetId);

    revalidatePath('/dashboard/assets');
    return { success: true, message: 'Asset deleted successfully.' };
  } catch (error: any) {
    console.error("Error deleting asset:", error);
    return { success: false, message: error.message || 'Failed to delete asset.' };
  }
}
