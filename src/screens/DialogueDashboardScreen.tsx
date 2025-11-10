import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { RootStackParamList } from '../types/navigation';
import {
  CATEGORY_TAXONOMY,
  TOTAL_CATEGORIES,
  INITIAL_PROMPT,
  NO_OP_CATEGORY,
  getTaxonomyString,
  getCompletionPercentage,
  findValidCategory,
  MappedCategory,
  ConversationInteraction,
} from '../services/categoryTaxonomyService';
import {
  getMappedCategories,
  saveMappedCategory,
  getConversationHistory,
  addConversationInteraction,
  clearAllData,
  isCategoryMapped,
} from '../services/categoryStorageService';
import { GeminiService } from '../services/geminiService';
import { ImagePickerService } from '../services/imagePickerService';
import ZoomableImageView from '../components/ZoomableImageView';
import ImageEditor from '../components/ImageEditor';

const { width } = Dimensions.get('window');

type DialogueDashboardNavigationProp = StackNavigationProp<RootStackParamList, 'DialogueDashboard'>;
type DialogueDashboardRouteProp = RouteProp<RootStackParamList, 'DialogueDashboard'>;

interface Props {
  navigation: DialogueDashboardNavigationProp;
  route: DialogueDashboardRouteProp;
}

type UIState = 'idle' | 'answering' | 'loading' | 'complete' | 'weak-fit';

export default function DialogueDashboardScreen({ navigation }: Props) {
  const [mappedCategories, setMappedCategories] = useState<MappedCategory[]>([]);
  const [interactions, setInteractions] = useState<ConversationInteraction[]>([]);
  const [uiState, setUiState] = useState<UIState>('idle');
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [prefetchedQuestion, setPrefetchedQuestion] = useState<string | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weakFitJustification, setWeakFitJustification] = useState('');
  const [savedQuestion, setSavedQuestion] = useState(''); // Store question for weak-fit retry
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = React.useRef<any>(null);
  
  // Image handling state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);
  const [zoomViewerVisible, setZoomViewerVisible] = useState(false);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  
  // FAB animation state
  const [isFabOpen, setIsFabOpen] = useState(false);
  const fabAnimation = useRef(new Animated.Value(0)).current;
  const button1Animation = useRef(new Animated.Value(0)).current;
  const button2Animation = useRef(new Animated.Value(0)).current;
  const button3Animation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  // Configure navigation header with reset button
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleReset}
          style={{ marginRight: 15 }}
          disabled={uiState !== 'idle' && uiState !== 'complete'}
        >
          <MaterialIcons
            name="refresh"
            size={24}
            color={uiState !== 'idle' && uiState !== 'complete' ? '#ccc' : '#fff'}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, uiState]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Check completion
  useEffect(() => {
    if (mappedCategories.length === TOTAL_CATEGORIES) {
      setUiState('complete');
      setPrefetchedQuestion(null);
      setIsPrefetching(false);
    }
  }, [mappedCategories.length]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('State changed:', { uiState, currentPrompt: currentPrompt.substring(0, 50) + '...', hasPrompt: !!currentPrompt });
  }, [uiState, currentPrompt]);

  // FAB animation functions
  const toggleFabMenu = () => {
    const toValue = isFabOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(fabAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(rotateAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.stagger(50, [
        Animated.spring(button1Animation, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(button2Animation, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(button3Animation, {
          toValue,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]),
    ]).start();
    
    setIsFabOpen(!isFabOpen);
  };

  const rotation = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const button1Style = {
    transform: [
      {
        translateX: button1Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -96],
        }),
      },
      {
        scale: button1Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  };

  const button2Style = {
    transform: [
      {
        translateX: button2Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -68],
        }),
      },
      {
        translateY: button2Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -68],
        }),
      },
      {
        scale: button2Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  };

  const button3Style = {
    transform: [
      {
        translateY: button3Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -96],
        }),
      },
      {
        scale: button3Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
      },
    ],
  };

  const loadData = async () => {
    try {
      const [mapped, history] = await Promise.all([
        getMappedCategories(),
        getConversationHistory()
      ]);
      setMappedCategories(mapped);
      setInteractions(history);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load your progress');
    } finally {
      setLoading(false);
    }
  };

  const getNextQuestion = useCallback(async (isPrefetch = false) => {
    setError('');

    if (mappedCategories.length === TOTAL_CATEGORIES) {
      setUiState('complete');
      return;
    }

    if (!isPrefetch) {
      setUiState('loading');
      setLoadingMessage('Synthesizing a new question...');
    }

    try {
      const taxonomyString = getTaxonomyString();
      const newQuestion = await GeminiService.synthesizeNextQuestion(
        interactions,
        mappedCategories,
        taxonomyString
      );

      if (isPrefetch) {
        console.log('Setting prefetched question:', newQuestion);
        setPrefetchedQuestion(newQuestion);
        setIsPrefetching(false);

        // If user is waiting, show question immediately
        setUiState(currentUiState => {
          if (currentUiState === 'loading' && loadingMessage.includes('Wait while')) {
            console.log('User was waiting, showing question immediately');
            setCurrentPrompt(newQuestion);
            return 'answering';
          }
          return currentUiState === 'loading' ? 'idle' : currentUiState;
        });

        setLoadingMessage('');
      } else {
        console.log('Setting current prompt (non-prefetch):', newQuestion);
        setCurrentPrompt(newQuestion);
        console.log('Setting uiState to answering');
        setUiState('answering');
        setLoadingMessage('');
        console.log('UI state should now be answering, modal should appear');
      }
    } catch (err) {
      console.error('Error getting next question:', err);
      setError('Failed to generate question. Please try again.');
      setIsPrefetching(false);
      setUiState('idle');
    }
  }, [interactions, mappedCategories, loadingMessage]);

  const mapAnswerToCategory = async (question: string, answer: string) => {
    setUiState('loading');
    setLoadingMessage('Analyzing your response...');
    setError('');

    setPrefetchedQuestion(null);
    setIsPrefetching(false);

    try {
      const isInitial = mappedCategories.length === 0;
      const taxonomyString = getTaxonomyString();

      const result = await GeminiService.mapAnswerToCategory(
        question,
        answer,
        isInitial,
        taxonomyString,
        mappedCategories
      );

      const { category: rawCategory, justification } = result;

      // Validate category
      const validCategory = findValidCategory(rawCategory);
      const categoryNameToCheck = validCategory ? validCategory.category : rawCategory;

      let mappingResult = 'NO_CHANGE';

      if (categoryNameToCheck === NO_OP_CATEGORY) {
        // NO-OP: weak fit - ask follow-up question
        console.log('NO-OP Mapping: weak fit. Justification:', justification);
        const interaction: ConversationInteraction = {
          question,
          answer,
          mappedCategory: 'NO-OP (WEAK FIT)',
          timestamp: new Date().toISOString()
        };
        await addConversationInteraction(interaction);
        setInteractions(prev => [...prev, interaction]);

        // Show weak fit modal with follow-up prompt
        setWeakFitJustification(justification);
        setUiState('weak-fit');
        return; // Don't prefetch or continue

      } else if (validCategory && !(await isCategoryMapped(categoryNameToCheck))) {
        // Successful mapping
        mappingResult = 'SUCCESS';

        const newMappedCategory: MappedCategory = {
          category: categoryNameToCheck,
          justification,
          dateIdentified: new Date().toISOString()
        };

        await saveMappedCategory(newMappedCategory);
        const newMappedCategories = [...mappedCategories, newMappedCategory];
        setMappedCategories(newMappedCategories);

        const interaction: ConversationInteraction = {
          question,
          answer,
          mappedCategory: categoryNameToCheck,
          timestamp: new Date().toISOString()
        };
        await addConversationInteraction(interaction);
        setInteractions(prev => [...prev, interaction]);

        // Trigger confetti animation for successful mapping!
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);

        if (newMappedCategories.length === TOTAL_CATEGORIES) {
          mappingResult = 'COMPLETE';
        }

      } else if (await isCategoryMapped(categoryNameToCheck)) {
        setError(`"${categoryNameToCheck}" is already mapped. Trying next question.`);
        const interaction: ConversationInteraction = {
          question,
          answer,
          mappedCategory: 'ALREADY MAPPED (IGNORED)',
          timestamp: new Date().toISOString()
        };
        await addConversationInteraction(interaction);
        setInteractions(prev => [...prev, interaction]);

      } else {
        setError(`Unexpected category: "${rawCategory}". Please try again.`);
        const interaction: ConversationInteraction = {
          question,
          answer,
          mappedCategory: 'MAPPING FAILED',
          timestamp: new Date().toISOString()
        };
        await addConversationInteraction(interaction);
        setInteractions(prev => [...prev, interaction]);
      }

      setUserAnswer('');

      // Prefetch next question if not complete - with a delay to avoid rate limits
      if (mappingResult !== 'COMPLETE' && mappingResult !== 'MAPPING_FAILED') {
        setIsPrefetching(true);
        // Add 2-second delay before prefetching to avoid hitting rate limits
        setTimeout(() => {
          getNextQuestion(true);
        }, 2000);
      }

      if (mappingResult === 'COMPLETE') {
        setUiState('complete');
      } else {
        setUiState('idle');
      }

    } catch (err) {
      console.error('Error mapping answer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process your answer. Please try again.';
      setError(errorMessage);
      setUiState('idle');
    }
  };

  const handleFabClick = () => {
    if (uiState !== 'idle') return;
    toggleFabMenu();
  };

  const handleTextInputPress = () => {
    toggleFabMenu();
    
    console.log('Text input selected. State:', { 
      mappedCount: mappedCategories.length, 
      hasPrefetched: !!prefetchedQuestion,
      isPrefetching,
      prefetchedQuestion 
    });

    if (mappedCategories.length === 0) {
      // Start with initial prompt
      console.log('Using initial prompt');
      setCurrentPrompt(INITIAL_PROMPT);
      setUiState('answering');
    } else if (prefetchedQuestion) {
      // Use prefetched question
      console.log('Using prefetched question:', prefetchedQuestion);
      setCurrentPrompt(prefetchedQuestion);
      setPrefetchedQuestion(null);
      setUiState('answering');
    } else if (isPrefetching) {
      // Wait for prefetch to complete
      console.log('Still prefetching, showing loading state');
      setUiState('loading');
      setLoadingMessage('Wait while the system thinks... your question is being prepared!');
    } else if (mappedCategories.length < TOTAL_CATEGORIES) {
      // Fallback: synchronous fetch
      console.log('No prefetch available, fetching new question synchronously');
      getNextQuestion(false);
    }
  };

  const handleVoiceInputPress = () => {
    toggleFabMenu();
    // Navigate to voice analysis screen
    navigation.navigate('VoiceAnalysis');
  };

  const handleImageInputPress = async () => {
    toggleFabMenu();
    
    // First get or generate a question
    if (mappedCategories.length === 0) {
      setCurrentPrompt(INITIAL_PROMPT);
      setSavedQuestion(INITIAL_PROMPT);
    } else if (prefetchedQuestion) {
      setCurrentPrompt(prefetchedQuestion);
      setSavedQuestion(prefetchedQuestion);
      setPrefetchedQuestion(null);
    } else if (!currentPrompt) {
      // Need to fetch a question first
      setUiState('loading');
      setLoadingMessage('Preparing your question...');
      await getNextQuestion(false);
      return;
    }
    
    // Wait for FAB animation to complete, then show choice dialog
    setTimeout(() => {
      Alert.alert(
        'Choose Image Source',
        'How would you like to add your image?',
        [
          {
            text: 'Take Photo',
            onPress: () => handleImageSelection(true), // Use camera
          },
          {
            text: 'Choose from Gallery',
            onPress: () => handleImageSelection(false), // Use gallery
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    }, 300);
  };

  const handleImageSelection = async (useCamera: boolean) => {
    try {
      const hasPermissions = await ImagePickerService.requestPermissions();
      if (!hasPermissions) {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library permissions are required to use this feature.'
        );
        return;
      }

      let result;
      if (useCamera) {
        result = await ImagePickerService.takePhotoWithCamera();
      } else {
        result = await ImagePickerService.pickImageFromGalleryWithOptions(false);
      }

      if (result.success && result.imageUri) {
        setTempImageUri(result.imageUri);
        setShowImageEditor(true);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while selecting image');
    }
  };

  const handleImageEditorSave = (editedImageUri: string) => {
    setSelectedImage(editedImageUri);
    setShowImageEditor(false);
    setTempImageUri(null);
    setUiState('answering'); // Show the answer modal with image preview
  };

  const handleImageEditorCancel = () => {
    setShowImageEditor(false);
    setTempImageUri(null);
    setUiState('idle');
  };

  const handleSubmitImage = async () => {
    if (!selectedImage || !currentPrompt) {
      Alert.alert('Error', 'Missing image or question');
      return;
    }

    setIsAnalyzingImage(true);
    setUiState('loading');
    setLoadingMessage('Analyzing your image response...');

    try {
      // Analyze the image with Gemini
      const analysisResult = await GeminiService.analyzeActionImage(selectedImage);
      
      if (!analysisResult.success || !analysisResult.rawResponse) {
        throw new Error(analysisResult.error || 'Failed to analyze image');
      }

      // Use the image analysis description as the answer
      const answer = analysisResult.rawResponse;
      
      // Clear image state
      setSelectedImage(null);
      
      // Map the answer to a category
      await mapAnswerToCategory(currentPrompt, answer);
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
      setUiState('idle');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      setError('Answer cannot be empty. Please provide a substantive response.');
      return;
    }

    const q = currentPrompt;
    const a = userAnswer;
    setSavedQuestion(q); // Save for potential weak-fit retry
    setCurrentPrompt('');
    setUserAnswer('');

    mapAnswerToCategory(q, a);
  };

  const handleWeakFitTryAgain = () => {
    // Re-open the answer modal with the same question
    setCurrentPrompt(savedQuestion); // Restore the original question
    setUiState('answering');
    setWeakFitJustification('');
  };

  const handleDismissAnswerModal = () => {
    // Close the answer modal and return to idle
    Keyboard.dismiss();
    setCurrentPrompt('');
    setUserAnswer('');
    setError('');
    setUiState('idle');
  };

  const handleWeakFitNewQuestion = async () => {
    // Move to next question
    setWeakFitJustification('');
    setUiState('loading');
    setLoadingMessage('Generating a new question...');
    
    try {
      await getNextQuestion(false);
    } catch (error) {
      setError('Failed to generate new question. Please try again.');
      setUiState('idle');
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset Dashboard',
      'Are you sure you want to reset? All progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              setMappedCategories([]);
              setInteractions([]);
              setCurrentPrompt('');
              setUserAnswer('');
              setUiState('idle');
              setError('');
              setLoadingMessage('');
              setPrefetchedQuestion(null);
              setIsPrefetching(false);
            } catch (error) {
              Alert.alert('Error', 'Failed to reset dashboard');
            }
          }
        }
      ]
    );
  };

  const handleCardClick = (categoryName: string) => {
    const mapped = mappedCategories.find(c => c.category === categoryName);
    if (mapped) {
      Alert.alert(
        categoryName,
        `Why you have this trait:\n\n"${mapped.justification}"`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Not Yet Mapped',
        'This trait is not yet mapped to you. Click the + button to discover new traits!',
        [{ text: 'OK' }]
      );
    }
  };

  const renderCategoryCards = () => {
    const mappedNames = new Set(mappedCategories.map(c => c.category));

    return CATEGORY_TAXONOMY.map(item => (
      <TouchableOpacity
        key={item.category}
        style={[
          styles.categoryCard,
          mappedNames.has(item.category) ? styles.categoryCardMapped : styles.categoryCardUnmapped
        ]}
        onPress={() => handleCardClick(item.category)}
      >
        <View style={styles.categoryHeader}>
          <MaterialIcons 
            name={item.icon as any || 'category'} 
            size={28} 
            color={mappedNames.has(item.category) ? '#667eea' : '#999'} 
          />
        </View>
        <Text style={styles.categoryTitle}>{item.category}</Text>
        <Text style={styles.categoryDescription}>{item.description}</Text>
        {mappedNames.has(item.category) && (
          <View style={styles.mappedBadge}>
            <MaterialIcons name="check-circle" size={16} color="#fff" />
            <Text style={styles.mappedText}>Mapped! Tap for details</Text>
          </View>
        )}
      </TouchableOpacity>
    ));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </View>
    );
  }

  const completionPercentage = getCompletionPercentage(mappedCategories.length);

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="explore" size={40} color="#fff" />
          <Text style={styles.title}>My Skills Passport</Text>
          <Text style={styles.subtitle}>
            {mappedCategories.length}/{TOTAL_CATEGORIES} categories discovered
          </Text>
        </View>

        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <Card.Content>
            <View style={styles.progressHeader}>
              <MaterialIcons name="trending-up" size={24} color="#667eea" />
              <Text style={styles.progressTitle}>Your Progress</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{mappedCategories.length}</Text>
                <Text style={styles.statLabel}>Mapped</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{TOTAL_CATEGORIES}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{completionPercentage}%</Text>
                <Text style={styles.statLabel}>Complete</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
            </View>
          </Card.Content>
        </Card>

        {error ? (
          <Card style={styles.errorCard}>
            <Card.Content>
              <Text style={styles.errorText}>🚨 {error}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Category Grid */}
        <View style={styles.categoryGrid}>
          {renderCategoryCards()}
        </View>
      </ScrollView>

      {/* Loading Modal */}
      <Modal
        visible={uiState === 'loading'}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalLoadingText}>{loadingMessage}</Text>
            <ActivityIndicator size="large" color="#667eea" style={styles.modalSpinner} />
          </View>
        </View>
      </Modal>

      {/* Completion Modal */}
      <Modal
        visible={uiState === 'complete'}
        transparent
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={() => setUiState('idle')}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <Text style={styles.completeTitle}>🎉 Congratulations!!! 🎉</Text>
                <Text style={styles.completeText}>
                  You have completed your skills passport with a flourish and can look forward to a very bright future. Thanks for participating.
                </Text>
                <Text style={styles.completeSubtext}>
                  Tap the Reset button if you want to try again.
                </Text>
                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => setUiState('idle')}
                >
                  <Text style={styles.dismissButtonText}>Dismiss Message</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Weak Fit Modal */}
      <Modal
        visible={uiState === 'weak-fit'}
        transparent
        animationType="fade"
      >
        <TouchableWithoutFeedback onPress={handleWeakFitNewQuestion}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <MaterialIcons name="help-outline" size={48} color="#ff9800" style={styles.weakFitIcon} />
                <Text style={styles.weakFitTitle}>Need More Details</Text>
                <Text style={styles.weakFitJustification}>{weakFitJustification}</Text>
                <Text style={styles.weakFitPrompt}>
                  Would you like to provide more details about your answer, or move to a different question?
                </Text>
                <View style={styles.weakFitButtons}>
                  <TouchableOpacity
                    style={[styles.weakFitButton, styles.weakFitButtonSecondary]}
                    onPress={handleWeakFitNewQuestion}
                  >
                    <MaterialIcons name="skip-next" size={20} color="#667eea" />
                    <Text style={styles.weakFitButtonTextSecondary}>New Question</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.weakFitButton, styles.weakFitButtonPrimary]}
                    onPress={handleWeakFitTryAgain}
                  >
                    <MaterialIcons name="edit" size={20} color="#fff" />
                    <Text style={styles.weakFitButtonTextPrimary}>Add Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Answer Modal */}
      <Modal
        visible={uiState === 'answering'}
        transparent
        animationType="slide"
        onShow={() => console.log('Answer modal opened with prompt:', currentPrompt)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={handleDismissAnswerModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.questionTitle}>Question for You</Text>
                  <Text style={styles.questionText}>{currentPrompt || '(No question loaded)'}</Text>
                  
                  {selectedImage ? (
                    /* Image Answer Mode */
                    <>
                      <TouchableOpacity onPress={() => setZoomViewerVisible(true)}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                      </TouchableOpacity>
                      <View style={styles.imageActions}>
                        <TouchableOpacity
                          style={styles.changeImageButton}
                          onPress={() => {
                            setSelectedImage(null);
                            // Show the same choice dialog when changing image
                            Alert.alert(
                              'Choose Image Source',
                              'How would you like to add your image?',
                              [
                                {
                                  text: 'Take Photo',
                                  onPress: () => handleImageSelection(true),
                                },
                                {
                                  text: 'Choose from Gallery',
                                  onPress: () => handleImageSelection(false),
                                },
                                {
                                  text: 'Cancel',
                                  style: 'cancel',
                                },
                              ],
                              { cancelable: true }
                            );
                          }}
                        >
                          <Text style={styles.changeImageButtonText}>Change Image</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.submitButton}
                          onPress={handleSubmitImage}
                          disabled={isAnalyzingImage}
                        >
                          <Text style={styles.submitButtonText}>
                            {isAnalyzingImage ? 'Analyzing...' : 'Submit Image'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    /* Text Answer Mode */
                    <>
                      <TextInput
                        style={styles.answerInput}
                        value={userAnswer}
                        onChangeText={setUserAnswer}
                        placeholder="Example: 'I led a team of 5 students to build a mobile app that helps local farmers track inventory. We used React Native and Firebase, and it's now used by 50+ farmers in our community.'"
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmitAnswer}
                      >
                        <Text style={styles.submitButtonText}>Submit Answer</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Animated FAB Buttons */}
      <View style={styles.fabContainer}>
        <View style={styles.fabInner}>
          {/* Action Button 1 - Text Input (Left) */}
          <Animated.View style={[styles.actionButton, button1Style]} pointerEvents="auto">
            <FAB
              icon={() => (
                <View style={styles.iconContainer}>
                  <MaterialIcons name="chat-bubble" size={24} color="white" />
                </View>
              )}
              onPress={handleTextInputPress}
              style={[styles.fab, { backgroundColor: '#45B7D1' }]}
              size="small"
            />
          </Animated.View>

          {/* Action Button 2 - Voice Input (Diagonal) */}
          <Animated.View style={[styles.actionButton, button2Style]} pointerEvents="auto">
            <FAB
              icon={() => (
                <View style={styles.iconContainer}>
                  <MaterialIcons name="mic" size={24} color="white" />
                </View>
              )}
              onPress={handleVoiceInputPress}
              style={[styles.fab, { backgroundColor: '#4ECDC4' }]}
              size="small"
            />
          </Animated.View>

          {/* Action Button 3 - Image Input (Top) */}
          <Animated.View style={[styles.actionButton, button3Style]} pointerEvents="auto">
            <FAB
              icon={() => (
                <View style={styles.iconContainer}>
                  <MaterialIcons name="image" size={24} color="white" />
                </View>
              )}
              onPress={handleImageInputPress}
              style={[styles.fab, { backgroundColor: '#FF6B6B' }]}
              size="small"
            />
          </Animated.View>

          {/* Main FAB */}
          <Animated.View style={[styles.mainFabWrapper, { transform: [{ rotate: rotation }] }]}>
            <FAB
              icon={() => (
                <View style={styles.iconContainer}>
                  <MaterialIcons name="add" size={28} color="white" />
                </View>
              )}
              onPress={handleFabClick}
              disabled={uiState !== 'idle' || mappedCategories.length === TOTAL_CATEGORIES}
              style={[styles.mainFab, { backgroundColor: '#667eea' }]}
              label={!isFabOpen ? "Start" : undefined}
            />
          </Animated.View>
        </View>
      </View>

      {/* Image Editor Modal */}
      {showImageEditor && tempImageUri && (
        <ImageEditor
          imageUri={tempImageUri}
          onSave={handleImageEditorSave}
          onCancel={handleImageEditorCancel}
        />
      )}

      {/* Zoom Viewer Modal */}
      {zoomViewerVisible && selectedImage && (
        <ZoomableImageView
          imageUri={selectedImage}
          visible={zoomViewerVisible}
          onClose={() => setZoomViewerVisible(false)}
        />
      )}

      {/* Confetti Animation */}
      {showConfetti && (
        <ConfettiCannon
          count={200}
          origin={{ x: width / 2, y: 0 }}
          autoStart={true}
          fadeOut={true}
          fallSpeed={3000}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 5,
  },
  progressCard: {
    marginBottom: 20,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 15,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#667eea',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
  },
  errorCard: {
    marginBottom: 20,
    backgroundColor: '#ffebee',
    elevation: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    minHeight: 140,
  },
  categoryHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryCardMapped: {
    borderWidth: 2,
    borderColor: '#667eea',
  },
  categoryCardUnmapped: {
    opacity: 0.6,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  categoryDescription: {
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
  },
  mappedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    gap: 4,
  },
  mappedText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    elevation: 5,
  },
  modalLoadingText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSpinner: {
    marginTop: 10,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    textAlign: 'center',
    marginBottom: 15,
  },
  completeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
  },
  completeSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  dismissButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 24,
  },
  answerInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#667eea',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  weakFitIcon: {
    alignSelf: 'center',
    marginBottom: 15,
  },
  weakFitTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ff9800',
    textAlign: 'center',
    marginBottom: 15,
  },
  weakFitJustification: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  weakFitPrompt: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  weakFitButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  weakFitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  weakFitButtonPrimary: {
    backgroundColor: '#667eea',
  },
  weakFitButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  weakFitButtonTextPrimary: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  weakFitButtonTextSecondary: {
    color: '#667eea',
    fontSize: 15,
    fontWeight: 'bold',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabInner: {
    position: 'relative',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainFab: {
    position: 'absolute',
    margin: 0,
    elevation: 6,
  },
  mainFabWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    elevation: 6,
  },
  fabAdd: {
    backgroundColor: '#667eea',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  changeImageButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeImageButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
