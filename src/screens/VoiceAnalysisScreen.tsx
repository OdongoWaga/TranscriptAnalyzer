import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Button, Card, Title, Paragraph, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { GeminiService } from '../services/geminiService';

type VoiceAnalysisScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VoiceAnalysis'>;

interface Props {
  navigation: VoiceAnalysisScreenNavigationProp;
}

const SKILLS_TAXONOMY = {
  'Human Skills': [
    'Communication', 'Collaboration', 'Leadership', 'Empathy', 'Active Listening',
    'Conflict Resolution', 'Networking', 'Public Speaking', 'Team Management'
  ],
  'Meta-Learning': [
    'Critical Thinking', 'Research Skills', 'Self-Reflection', 'Learning Strategies',
    'Information Synthesis', 'Knowledge Transfer', 'Continuous Learning', 'Adaptability'
  ],
  'Maker & Builder': [
    'Prototyping', 'Design Thinking', 'Craftsmanship', 'Innovation', 'Technical Skills',
    'Project Management', 'Problem Solving', 'Creative Construction', 'Engineering'
  ],
  'Civic Impact': [
    'Community Engagement', 'Social Responsibility', 'Advocacy', 'Volunteer Work',
    'Policy Understanding', 'Cultural Awareness', 'Environmental Stewardship', 'Civic Participation'
  ],
  'Creative Expression': [
    'Artistic Creation', 'Storytelling', 'Music', 'Writing', 'Visual Arts',
    'Performance', 'Creative Problem Solving', 'Imagination', 'Aesthetic Appreciation'
  ],
  'Problem-Solving': [
    'Analytical Thinking', 'Strategic Planning', 'Troubleshooting', 'Decision Making',
    'Systems Thinking', 'Root Cause Analysis', 'Innovation', 'Logic', 'Pattern Recognition'
  ],
  'Work Experience': [
    'Professional Skills', 'Industry Knowledge', 'Workplace Etiquette', 'Time Management',
    'Client Relations', 'Business Acumen', 'Career Development', 'Mentorship'
  ],
  'Future Self': [
    'Goal Setting', 'Vision Creation', 'Personal Growth', 'Skill Development',
    'Career Planning', 'Life Balance', 'Self-Improvement', 'Aspiration Mapping'
  ]
};

export default function VoiceAnalysisScreen({ navigation }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [analysis, setAnalysis] = useState<string>('');
  const [identifiedSkills, setIdentifiedSkills] = useState<{[category: string]: string[]}>({});
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const recording = useRef<Audio.Recording | null>(null);
  const durationTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant microphone permission to record audio.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  };

  const startRecording = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recording.current = newRecording;
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration timer
      durationTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording.current) return;

      setIsRecording(false);
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }

      await recording.current.stopAndUnloadAsync();
      const uri = recording.current.getURI();
      
      if (uri) {
        setIsProcessing(true);
        await processAudio(uri);
      }
      
      recording.current = null;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
    }
  };

  const processAudio = async (audioUri: string) => {
    try {
      // First, transcribe the audio
      const transcriptionResult = await GeminiService.transcribeAudio(audioUri);
      
      if (!transcriptionResult.success || !transcriptionResult.transcript) {
        Alert.alert('Error', transcriptionResult.error || 'Failed to transcribe audio');
        setIsProcessing(false);
        return;
      }

      setTranscript(transcriptionResult.transcript);
      
      // Now analyze the transcript using the skills taxonomy
      await analyzeTranscriptWithTaxonomy(transcriptionResult.transcript);
      
    } catch (error) {
      console.error('Error processing audio:', error);
      Alert.alert('Error', 'Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeTranscriptWithTaxonomy = async (transcriptText: string) => {
    try {
      const analysisPrompt = `
Analyze the following transcript where someone is describing what they do when they lose track of time. Based on the content, identify which skills and categories from this taxonomy apply:

SKILLS TAXONOMY:
${Object.entries(SKILLS_TAXONOMY).map(([category, skills]) => 
  `${category}: ${skills.join(', ')}`
).join('\n')}

TRANSCRIPT: "${transcriptText}"

Please provide:
1. A brief analysis of what this person enjoys doing and why it makes them lose track of time
2. Which specific skills from the taxonomy are demonstrated or developed through their activities
3. Which taxonomy categories are most relevant to their interests
4. Insights about their potential strengths and growth areas

Format your response as a thoughtful analysis that helps them understand their skills and interests better.`;

      const analysisResult = await GeminiService.processTranscriptText(analysisPrompt);
      
      if (analysisResult) {
        setAnalysis(analysisResult);
        
        // Extract skills mentioned in the analysis
        const extractedSkills: {[category: string]: string[]} = {};
        
        Object.entries(SKILLS_TAXONOMY).forEach(([category, skills]) => {
          const matchedSkills = skills.filter(skill => 
            transcriptText.toLowerCase().includes(skill.toLowerCase()) ||
            analysisResult.toLowerCase().includes(skill.toLowerCase())
          );
          
          if (matchedSkills.length > 0) {
            extractedSkills[category] = matchedSkills;
          }
        });
        
        setIdentifiedSkills(extractedSkills);
      }
      
    } catch (error) {
      console.error('Error analyzing transcript:', error);
      Alert.alert('Error', 'Failed to analyze transcript. Please try again.');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetSession = () => {
    setTranscript('');
    setAnalysis('');
    setIdentifiedSkills({});
    setRecordingDuration(0);
  };

  return (
    <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Voice Analysis</Text>
          <Text style={styles.subtitle}>
            Tell me about what you do when you lose track of time
          </Text>
        </View>

        <Card style={styles.recordingCard}>
          <Card.Content style={styles.recordingContent}>
            {!isRecording && !transcript && (
              <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
                <MaterialIcons name="mic" size={28} color="#fff" style={styles.recordButtonIcon} />
                <Text style={styles.recordButtonText}>Tap to Start</Text>
              </TouchableOpacity>
            )}

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.pulseContainer}>
                  <MaterialIcons name="mic" size={60} color="#ff4444" />
                </View>
                <Text style={styles.recordingText}>Recording...</Text>
                <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>
                <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
                  <MaterialIcons name="stop" size={40} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {isProcessing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#4c669f" />
                <Text style={styles.processingText}>Analyzing your voice...</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {transcript && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>What You Said:</Title>
              <Paragraph style={styles.transcriptText}>{transcript}</Paragraph>
            </Card.Content>
          </Card>
        )}

        {analysis && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Skills Analysis:</Title>
              <Paragraph style={styles.analysisText}>{analysis}</Paragraph>
            </Card.Content>
          </Card>
        )}

        {Object.keys(identifiedSkills).length > 0 && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Identified Skills:</Title>
              {Object.entries(identifiedSkills).map(([category, skills]) => (
                <View key={category} style={styles.skillCategory}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <View style={styles.skillsContainer}>
                    {skills.map((skill, index) => (
                      <View key={index} style={styles.skillChip}>
                        <Text style={styles.skillText}>{skill}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {(transcript || analysis) && (
          <View style={styles.actionButtons}>
            <Button 
              mode="outlined" 
              onPress={resetSession}
              style={styles.actionButton}
              labelStyle={styles.buttonLabel}
            >
              Record Again
            </Button>
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('Dashboard')}
              style={[styles.actionButton, styles.primaryButton]}
              labelStyle={styles.buttonLabel}
            >
              View Dashboard
            </Button>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  recordingCard: {
    marginBottom: 20,
    elevation: 4,
  },
  recordingContent: {
    alignItems: 'center',
    padding: 30,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    elevation: 0,
  },
  recordButtonIcon: {
    marginRight: 8,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingIndicator: {
    alignItems: 'center',
  },
  pulseContainer: {
    padding: 20,
  },
  recordingText: {
    fontSize: 18,
    color: '#ff4444',
    fontWeight: 'bold',
    marginTop: 10,
  },
  durationText: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
    marginTop: 5,
  },
  stopButton: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 50,
    marginTop: 20,
  },
  processingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  resultCard: {
    marginBottom: 20,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  skillCategory: {
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4c669f',
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillChip: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    margin: 3,
  },
  skillText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  primaryButton: {
    backgroundColor: '#4c669f',
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});