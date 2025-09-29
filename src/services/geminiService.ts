import axios from 'axios';
import * as FileSystem from 'expo-file-system/legacy';
import { AnalysisResult, TranscriptAnalysis } from '../types';
import { CONFIG, getGeminiApiKey } from '../config/env';

export class GeminiService {
  // Test method to validate API connection
  public static async testApiConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const apiUrl = `${CONFIG.GEMINI_API_URL}?key=${getGeminiApiKey()}`;
      console.log('Testing API connection to:', apiUrl);
      
      const testRequestBody = {
        contents: [
          {
            parts: [
              {
                text: "Hello, this is a test message."
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
        }
      };

      const response = await axios.post(
        apiUrl,
        testRequestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000, // Timeout for test
        }
      );

      console.log('Test API Response:', response.status);
      return { success: true };
      
    } catch (error) {
      console.error('API Connection Test Failed:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          return { 
            success: false, 
            error: `API Error: ${error.response.status} - ${error.response.statusText}` 
          };
        } else if (error.request) {
          return { 
            success: false, 
            error: 'Network Error: No response from server' 
          };
        }
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  private static async encodeImageToBase64(imageUri: string): Promise<string> {
    try {
      // Get file info to check size
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      const fileSize = (fileInfo as any)?.size as number | undefined;
      if (fileSize != null) {
        console.log('Image file size:', fileSize, 'bytes');
      }
      
      // Check if file is too large (max 4MB for API)
      if (fileSize && fileSize > CONFIG.MAX_IMAGE_SIZE) {
        console.warn('Image is too large, attempting to compress...');
        // For now, we'll proceed but warn the user
      }
      
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        // EncodingType enum moved; string literal is supported in SDK 54
        encoding: 'base64' as any,
      });
      
      console.log('Base64 encoded image size:', base64.length, 'characters');
      
      // Check if base64 is too large (API limit is around 20MB)
      if (base64.length > 20 * 1024 * 1024) {
        throw new Error('Image is too large after encoding. Please use a smaller image.');
      }
      
      return base64;
    } catch (error) {
      console.error('Error encoding image:', error);
      throw new Error('Failed to encode image to base64: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  //written from claude. 
  private static createPrompt(): string {
    return `Analyze this academic transcript image and extract course information. Return a JSON object with this structure:

{
  "courses": [
    {
      "code": "Course code",
      "name": "Course name", 
      "grade": "Grade received",
      "credits": "Credit hours",
      "semester": "Semester if available",
      "year": "Year if available"
    }
  ],
  "gpa": "Overall GPA if visible",
  "totalCredits": "Total credit hours if visible",
  "institution": "Institution name if visible",
  "studentName": "Student name if visible",
  "degree": "Degree program if visible",
  "graduationDate": "Graduation date if visible"
}

Extract all visible course information accurately. If information is not clear, use null or omit the field. Return only valid JSON.`;
  }

  public static async analyzeTranscript(imageUri: string): Promise<AnalysisResult> {
    try {
      const base64Image = await this.encodeImageToBase64(imageUri);
      
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: this.createPrompt()
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
        }
      };

      // Try the primary model first
      let apiUrl = `${CONFIG.GEMINI_API_URL}?key=${getGeminiApiKey()}`;
      console.log('Making API request to:', apiUrl);
      console.log('Request body size:', JSON.stringify(requestBody).length, 'characters');
      
      let response;
      try {
        response = await axios.post(
          apiUrl,
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: CONFIG.REQUEST_TIMEOUT,
          }
        );
      } catch (error) {
        // If first model fails, try the 1.5 flash model as fallback
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log('Primary model failed, trying fallback model...');
          const fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
          apiUrl = `${fallbackUrl}?key=${getGeminiApiKey()}`;
          
          response = await axios.post(
            apiUrl,
            requestBody,
            {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: CONFIG.REQUEST_TIMEOUT,
            }
          );
        } else {
          throw error;
        }
      }
      
      console.log('API Response received:', response.status);

      const responseText = response.data.candidates[0].content.parts[0].text;
      
      // Try to extract JSON from the response
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          success: false,
          error: 'Could not parse JSON response from Gemini',
          rawResponse: responseText
        };
      }

      const parsedData: TranscriptAnalysis = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        data: parsedData,
        rawResponse: responseText
      };

    } catch (error) {
      console.error('Error analyzing transcript:', error);
      
      // Enhanced error handling for different types of errors
      let errorMessage = 'Unknown error occurred';
      let errorDetails = '';
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Server responded with error status
          errorMessage = `API Error: ${error.response.status} - ${error.response.statusText}`;
          errorDetails = `Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`;
          console.error('API Response Error:', error.response.data);
        } else if (error.request) {
          // Request was made but no response received
          errorMessage = 'Network Error: No response from server';
          errorDetails = 'Check your internet connection and try again';
        } else {
          // Something else happened
          errorMessage = `Request Error: ${error.message}`;
          errorDetails = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || error.message;
      }
      
      return {
        success: false,
        error: errorMessage,
        rawResponse: errorDetails
      };
    }
  }

  // Send audio file to Gemini API for transcription
  public static async transcribeAudio(audioUri: string): Promise<{ success: boolean; transcript?: string; error?: string }> {
    try {
      console.log('Starting audio transcription for:', audioUri);
      
      // Determine MIME type based on file extension
      let mimeType = 'audio/wav';
      if (audioUri.includes('.m4a')) {
        mimeType = 'audio/mp4';
      } else if (audioUri.includes('.mp3')) {
        mimeType = 'audio/mpeg';
      } else if (audioUri.includes('.aac')) {
        mimeType = 'audio/aac';
      }
      
      console.log('Detected audio format:', mimeType);
      
      // Encode audio to base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64' as any,
      });
      
      console.log('Audio encoded to base64, size:', base64Audio.length, 'characters');
      
      const apiUrl = `${CONFIG.GEMINI_API_URL}?key=${getGeminiApiKey()}`;
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: "Please transcribe the following audio file. Return only the transcribed text, no additional formatting or commentary."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Audio
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      };

      let response;
      try {
        response = await axios.post(apiUrl, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.REQUEST_TIMEOUT,
        });
      } catch (error) {
        // Try fallback model if primary fails
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log('Primary model failed for audio, trying fallback...');
          const fallbackUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
          const fallbackApiUrl = `${fallbackUrl}?key=${getGeminiApiKey()}`;
          
          response = await axios.post(fallbackApiUrl, requestBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: CONFIG.REQUEST_TIMEOUT,
          });
        } else {
          throw error;
        }
      }

      const transcript = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!transcript) {
        return {
          success: false,
          error: 'No transcription received from API'
        };
      }

      console.log('Transcription successful:', transcript.length, 'characters');
      return {
        success: true,
        transcript: transcript.trim()
      };

    } catch (error) {
      console.error('Error transcribing audio:', error);
      
      let errorMessage = 'Audio transcription failed';
      if (axios.isAxiosError(error)) {
        if (error.response) {
          errorMessage = `API Error: ${error.response.status} - ${error.response.statusText}`;
        } else if (error.request) {
          errorMessage = 'Network Error: No response from server';
        } else {
          errorMessage = `Request Error: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Send plain text (e.g., on-device STT transcript) to Gemini and get a response string
  public static async processTranscriptText(transcript: string): Promise<string> {
    try {
      const apiUrl = `${CONFIG.GEMINI_API_URL}?key=${getGeminiApiKey()}`;
      const requestBody = {
        contents: [
          {
            parts: [
              {
                text:
                  `You will receive a transcript captured via on-device speech recognition.\n` +
                  `Transcript:\n"""${transcript}"""\n` +
                  `Provide a concise response or summary. If a task is requested, perform it.`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 512,
        },
      };

      const response = await axios.post(apiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: CONFIG.REQUEST_TIMEOUT,
      });

      return (
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      );
    } catch (error) {
      console.error('Error processing transcript text:', error);
      return '';
    }
  }
}
