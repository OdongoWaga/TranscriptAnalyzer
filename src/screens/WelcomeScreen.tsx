import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { FAB } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

interface Props {
  navigation: WelcomeScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Animation values for each button
  const animation = useRef(new Animated.Value(0)).current;
  const button1Animation = useRef(new Animated.Value(0)).current;
  const button2Animation = useRef(new Animated.Value(0)).current;
  const button3Animation = useRef(new Animated.Value(0)).current;
  const rotateAnimation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    Animated.parallel([
      Animated.spring(animation, {
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
    
    setIsOpen(!isOpen);
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
        translateY: button1Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0],
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
        translateX: button3Animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0],
        }),
      },
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

  const handleAnalyzeTranscript = () => {
    console.log('Analyze Transcript button pressed');
    toggleMenu();
    navigation.navigate('Home');
  };

  const handleVoiceTranscription = () => {
    console.log('Voice Transcription button pressed');
    toggleMenu();
    navigation.navigate('VoiceAnalysis');
  };

  const handleTextAnalysis = () => {
    console.log('Text Analysis button pressed');
    toggleMenu();
    navigation.navigate('TextAnalysis');
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.mainText}>
          What are you doing when you lose track of time?
        </Text>
      </View>

      <View style={styles.fabContainer}>
        <View style={styles.fabInner}>
        {/* Action Button 1 - Analyze Transcript */}
        <Animated.View style={[styles.actionButton, button1Style]} pointerEvents="auto">
          <FAB
            icon={() => (
              <View style={styles.iconContainer}>
                <MaterialIcons name="image" size={28} color="white" />
              </View>
            )}
            onPress={handleAnalyzeTranscript}
            style={[styles.fab, { backgroundColor: '#FF6B6B' }]}
            size="small"
          />
        </Animated.View>

        {/* Action Button 2 - Voice Transcription */}
        <Animated.View style={[styles.actionButton, button2Style]} pointerEvents="auto">
          <FAB
            icon={() => (
              <View style={styles.iconContainer}>
                <MaterialIcons name="mic" size={28} color="white" />
              </View>
            )}
            onPress={handleVoiceTranscription}
            style={[styles.fab, { backgroundColor: '#4ECDC4' }]}
            size="small"
          />
        </Animated.View>

        {/* Action Button 3 - Text Analysis */}
        <Animated.View style={[styles.actionButton, button3Style]} pointerEvents="auto">
          <FAB
            icon={() => (
              <View style={styles.iconContainer}>
                <MaterialIcons name="chat-bubble" size={28} color="white" />
              </View>
            )}
            onPress={handleTextAnalysis}
            style={[styles.fab, { backgroundColor: '#45B7D1' }]}
            size="small"
          />
        </Animated.View>

        {/* Main FAB */}
        <Animated.View style={[styles.mainFabWrapper, { transform: [{ rotate: rotation }] }]}>
          <FAB
            icon={() => (
              <View style={styles.iconContainer}>
                <MaterialIcons name="add" size={32} color="white" />
              </View>
            )}
            onPress={toggleMenu}
            style={[styles.mainFab, { backgroundColor: '#6C5CE7' }]}
          />
        </Animated.View>
        </View>
      </View>


    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  mainText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 40,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 10,
  },
  // Inner origin used to anchor the main FAB at center while keeping absolute children
  fabInner: {
    width: 56,
    height: 56,
    position: 'relative',
   
  },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  actionButton: {
    position: 'absolute',
    // slight inset so 48px action FAB sits visually centered in 56px origin
    bottom: 4,
    right: 4,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    elevation: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  mainFabWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
});