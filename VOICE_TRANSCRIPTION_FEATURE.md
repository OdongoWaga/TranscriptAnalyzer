# Voice Transcription Feature

## Overview

The Blue Screen has been transformed into a **Voice Transcription** screen that allows users to record their voice and get AI-powered transcription using the Gemini API.

## How It Works

### 1. Recording Process

- Uses **expo-av** for high-quality audio recording
- Records in native device format (typically M4A on iOS, varies on Android)
- Automatically handles microphone permissions

### 2. Transcription Process

- Sends recorded audio directly to **Gemini AI API** for transcription
- Supports multiple audio formats (M4A, MP3, WAV, AAC)
- Automatically detects audio format and sets appropriate MIME type
- Returns clean transcribed text

### 3. User Interface

- **Start Recording**: Begin audio capture
- **Stop Recording**: End recording and automatically start transcription
- **Processing**: Shows spinner while Gemini processes the audio
- **Results**: Displays transcribed text with copy/clear options
- **History**: Keeps track of recent transcriptions

## Features

### ✅ What's New

- **Audio Recording**: High-quality voice recording using expo-av
- **AI Transcription**: Powered by Gemini API (no local processing needed)
- **Format Support**: Automatically handles different audio formats
- **Permission Management**: Proper microphone permission handling
- **Error Handling**: Comprehensive error messages and retry options
- **History**: Maintains recent transcription history
- **Copy/Clear**: Easy text manipulation options

### ✅ Gemini Integration

- Uses the existing `GeminiService` class
- Added new `transcribeAudio()` method
- Proper error handling and fallback model support
- Automatic base64 encoding of audio files
- Temporary file cleanup after processing

## Technical Details

### Audio Recording

```typescript
// Uses expo-av with HIGH_QUALITY preset
const { recording } = await Audio.Recording.createAsync(
  Audio.RecordingOptionsPresets.HIGH_QUALITY
);
```

### Gemini API Integration

```typescript
// New method in GeminiService
public static async transcribeAudio(audioUri: string): Promise<{
  success: boolean;
  transcript?: string;
  error?: string
}>
```

### Supported Audio Formats

- **M4A** (default on iOS): `audio/mp4`
- **MP3**: `audio/mpeg`
- **WAV**: `audio/wav`
- **AAC**: `audio/aac`

## Usage Instructions

1. **Grant Permission**: Allow microphone access when prompted
2. **Start Recording**: Tap the record button and begin speaking
3. **Stop Recording**: Tap stop when finished speaking
4. **Wait for Processing**: Gemini will transcribe your audio
5. **View Results**: See your transcribed text appear on screen
6. **Copy or Clear**: Use action buttons to manage the text
7. **Access History**: View recent transcriptions below

## Error Handling

The feature includes comprehensive error handling for:

- **Permission Issues**: Clear prompts to grant microphone access
- **Network Errors**: Informative messages for connectivity issues
- **API Errors**: Specific Gemini API error reporting
- **File Errors**: Proper cleanup of temporary audio files
- **Format Issues**: Automatic format detection and fallback

## Performance Considerations

- **File Size**: Audio files are automatically cleaned up after processing
- **Network**: Transcription requires internet connection for Gemini API
- **Battery**: Recording uses minimal battery compared to continuous speech recognition
- **Privacy**: Audio is sent to Gemini API for processing (not stored locally)

## Comparison with Previous Implementation

### Before (React Native Voice)

- ❌ Local speech recognition only
- ❌ Required device build (not available in Expo Go)
- ❌ Limited accuracy depending on device
- ❌ Real-time processing overhead

### After (Gemini AI Transcription)

- ✅ Cloud-based AI transcription
- ✅ Works in Expo Go (development)
- ✅ High accuracy with Gemini AI
- ✅ Efficient batch processing
- ✅ Supports multiple languages (Gemini capability)

## Dependencies Added

```json
{
  "expo-av": "~19.0.x"
}
```

## Configuration Required

- Microphone permissions (already configured in app.json)
- Gemini API key (already configured in env.ts)
- No additional setup required!
