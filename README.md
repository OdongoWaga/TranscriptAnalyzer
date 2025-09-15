# Academic Transcript Analyzer

A React Native mobile application that uses Google's Gemini AI to analyze academic transcripts from images. The app allows users to upload photos of their academic transcripts and extracts course information, grades, GPA, and other academic details.

## Features

- 📱 **Mobile-First Design**: Built with React Native and Expo for cross-platform compatibility
- 📸 **Image Upload**: Take photos with camera or select from gallery
- 🤖 **AI Analysis**: Powered by Google Gemini Vision API for accurate transcript extraction
- 📊 **Structured Results**: Displays course information, grades, GPA, and academic summary
- 🎨 **Modern UI**: Beautiful gradient design with Material Design components
- 📤 **Share Results**: Share analysis results via native sharing
- 🔒 **Privacy Focused**: No data storage, all processing done via API

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- Google Gemini API key

## Installation

1. **Clone or navigate to the project directory:**

   ```bash
   cd TranscriptAnalyzer
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up your Gemini API key:**

   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Open `src/services/geminiService.ts`
   - Replace `YOUR_GEMINI_API_KEY` with your actual API key

4. **Start the development server:**
   ```bash
   npx expo start
   ```

## Usage

### Running the App

1. **For iOS Simulator:**

   ```bash
   npm run ios
   ```

2. **For Android Emulator:**

   ```bash
   npm run android
   ```

3. **For Web Browser:**

   ```bash
   npm run web
   ```

4. **On Physical Device:**
   - Install Expo Go app from App Store/Google Play
   - Scan the QR code displayed in the terminal

### Using the App

1. **Upload Transcript Image:**

   - Tap "Choose from Gallery" to select an existing image
   - Tap "Take Photo" to capture a new image with camera
   - Ensure the transcript is clearly visible and well-lit

2. **Analyze Transcript:**

   - Tap "Analyze Transcript" to send the image to Gemini AI
   - Wait for the analysis to complete (usually 10-30 seconds)

3. **View Results:**
   - Review extracted course information
   - Check grades, GPA, and academic summary
   - Share results if desired

## Project Structure

```
TranscriptAnalyzer/
├── src/
│   ├── components/          # Reusable UI components
│   ├── screens/            # Main app screens
│   │   ├── HomeScreen.tsx  # Main upload and analysis screen
│   │   └── ResultScreen.tsx # Results display screen
│   ├── services/           # API and utility services
│   │   ├── geminiService.ts    # Gemini AI integration
│   │   └── imagePickerService.ts # Image selection logic
│   └── types/              # TypeScript type definitions
├── App.tsx                 # Main app component with navigation
├── app.json               # Expo configuration
└── package.json           # Dependencies and scripts
```

## Configuration

### API Key Setup

The app requires a Google Gemini API key to function. Follow these steps:

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Open `src/services/geminiService.ts`
6. Replace `YOUR_GEMINI_API_KEY` with your actual key

### Environment Variables (Optional)

For better security, you can use environment variables:

1. Create a `.env` file in the root directory
2. Add: `GEMINI_API_KEY=your_actual_api_key_here`
3. Install `react-native-dotenv` if needed
4. Update the service to use `process.env.GEMINI_API_KEY`

## Permissions

The app requires the following permissions:

- **Camera**: To take photos of transcripts
- **Photo Library**: To select existing transcript images
- **Internet**: To communicate with Gemini API

These permissions are automatically requested when needed.

## Troubleshooting

### Common Issues

1. **"Analysis Failed" Error:**

   - Ensure your Gemini API key is correctly set
   - Check your internet connection
   - Try with a clearer, better-lit image
   - Verify the transcript text is readable

2. **Image Upload Issues:**

   - Grant camera and photo library permissions
   - Ensure sufficient storage space
   - Try restarting the app

3. **Build Errors:**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`
   - Reset Expo cache: `npx expo start --clear`

### Performance Tips

- Use high-quality, well-lit images for better analysis
- Ensure transcript text is clearly visible and not blurry
- Close other apps to free up memory
- Use a stable internet connection for API calls

## API Usage

The app uses Google's Gemini Pro Vision model for image analysis. The API:

- Processes images up to 4MB
- Supports JPEG, PNG, and WebP formats
- Returns structured JSON data
- Has rate limits (check Google AI Studio for current limits)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:

- Check the troubleshooting section above
- Review Expo and React Native documentation
- Consult Google Gemini API documentation

## Future Enhancements

- PDF upload support
- Multiple transcript comparison
- Export to various formats (PDF, CSV)
- Offline processing capabilities
- Enhanced error handling and retry logic
- User authentication and history
- Custom analysis templates
