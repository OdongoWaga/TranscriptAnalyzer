import * as ImagePicker from 'expo-image-picker';
import { ImageUploadResult } from '../types';
import { CONFIG } from '../config/env';

export class ImagePickerService {
  public static async requestPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    
    return status === 'granted' && cameraStatus.status === 'granted';
  }

  public static async pickImageFromGalleryWithOptions(allowEditing: boolean = false): Promise<ImageUploadResult> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: allowEditing,
        aspect: allowEditing ? CONFIG.IMAGE_ASPECT_RATIO : undefined,
        quality: CONFIG.IMAGE_QUALITY,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return {
          success: true,
          imageUri: result.assets[0].uri,
        };
      } else {
        return {
          success: false,
          error: 'No image selected',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pick image from gallery',
      };
    }
  }

  public static async takePhotoWithCamera(): Promise<ImageUploadResult> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false, // Disable editing to allow full image capture
        quality: CONFIG.IMAGE_QUALITY,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        return {
          success: true,
          imageUri: result.assets[0].uri,
        };
      } else {
        return {
          success: false,
          error: 'No photo taken',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to take photo',
      };
    }
  }
}
