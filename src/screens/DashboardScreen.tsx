import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Button, Card, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface Stamp {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  unlocked: boolean;
  dateUnlocked?: string;
}

interface UserProgress {
  totalScans: number;
  stamps: Stamp[];
  achievements: string[];
  transcriptData?: TranscriptSummary;
  lastScanDate?: string;
}

interface TranscriptSummary {
  institution?: string;
  studentName?: string;
  degree?: string;
  gpa?: string;
  totalCredits?: string;
  graduationDate?: string;
  coursesBySubject: { [key: string]: number };
  topGrades: string[];
  achievements: string[];
}

interface CourseAnalysis {
  subjects: { [key: string]: number };
  advancedCourses: number;
  diversityScore: number;
  totalCourses: number;
}

const AVAILABLE_STAMPS: Stamp[] = [
  // Academic Stamps
  { id: 'math', name: 'Mathematics Master', icon: '🧮', category: 'Academic', description: 'Completed mathematics courses', unlocked: false },
  { id: 'science', name: 'Science Scholar', icon: '🔬', category: 'Academic', description: 'Excelled in science subjects', unlocked: false },
  { id: 'literature', name: 'Literature Lover', icon: '📚', category: 'Academic', description: 'Studied literature and languages', unlocked: false },
  { id: 'history', name: 'History Buff', icon: '🏛️', category: 'Academic', description: 'Passionate about history', unlocked: false },
  { id: 'art', name: 'Creative Artist', icon: '🎨', category: 'Academic', description: 'Pursued arts and creativity', unlocked: false },
  { id: 'music', name: 'Music Maestro', icon: '🎵', category: 'Academic', description: 'Talented in music', unlocked: false },
  
  // Achievement Stamps
  { id: 'dean_list', name: 'Dean\'s List', icon: '⭐', category: 'Achievement', description: 'Made it to the Dean\'s List', unlocked: false },
  { id: 'honor_roll', name: 'Honor Roll', icon: '🏆', category: 'Achievement', description: 'Achieved honor roll status', unlocked: false },
  { id: 'graduate', name: 'Graduate', icon: '🎓', category: 'Achievement', description: 'Successfully graduated', unlocked: false },
  { id: 'scholarship', name: 'Scholar', icon: '💎', category: 'Achievement', description: 'Received scholarships', unlocked: false },
  
  // Interest Stamps
  { id: 'technology', name: 'Tech Enthusiast', icon: '💻', category: 'Interest', description: 'Passionate about technology', unlocked: false },
  { id: 'sports', name: 'Athletic Spirit', icon: '⚽', category: 'Interest', description: 'Active in sports', unlocked: false },
  { id: 'leadership', name: 'Natural Leader', icon: '👑', category: 'Interest', description: 'Demonstrated leadership skills', unlocked: false },
  { id: 'community', name: 'Community Helper', icon: '🤝', category: 'Interest', description: 'Engaged in community service', unlocked: false },
  { id: 'research', name: 'Research Pioneer', icon: '🔍', category: 'Interest', description: 'Involved in research projects', unlocked: false },
  { id: 'international', name: 'Global Citizen', icon: '🌍', category: 'Interest', description: 'International experience', unlocked: false },
];

// Helper functions for transcript analysis
const analyzeCourses = (courses: any[]): CourseAnalysis => {
  const subjects: { [key: string]: number } = {};
  let advancedCourses = 0;
  
  courses.forEach(course => {
    const courseName = course.name?.toLowerCase() || '';
    const courseCode = course.code?.toLowerCase() || '';
    
    // Count courses by subject
    if (courseName.includes('math') || courseName.includes('calculus') || courseName.includes('algebra') || courseCode.includes('math')) {
      subjects['math'] = (subjects['math'] || 0) + 1;
    }
    if (courseName.includes('science') || courseName.includes('physics') || courseName.includes('chemistry') || courseName.includes('biology')) {
      subjects['science'] = (subjects['science'] || 0) + 1;
    }
    if (courseName.includes('literature') || courseName.includes('english') || courseName.includes('writing')) {
      subjects['literature'] = (subjects['literature'] || 0) + 1;
    }
    if (courseName.includes('history') || courseName.includes('hist')) {
      subjects['history'] = (subjects['history'] || 0) + 1;
    }
    if (courseName.includes('art') || courseName.includes('design') || courseName.includes('drawing')) {
      subjects['art'] = (subjects['art'] || 0) + 1;
    }
    if (courseName.includes('music') || courseName.includes('band') || courseName.includes('orchestra')) {
      subjects['music'] = (subjects['music'] || 0) + 1;
    }
    if (courseName.includes('business') || courseName.includes('economics') || courseName.includes('finance') || courseName.includes('marketing')) {
      subjects['business'] = (subjects['business'] || 0) + 1;
    }
    if (courseName.includes('engineering') || courseName.includes('computer') || courseName.includes('programming') || courseName.includes('tech')) {
      subjects['engineering'] = (subjects['engineering'] || 0) + 1;
    }
    if (courseName.includes('sport') || courseName.includes('physical') || courseName.includes('athletics')) {
      subjects['sports'] = (subjects['sports'] || 0) + 1;
    }
    if (courseName.includes('leadership') || courseName.includes('management')) {
      subjects['leadership'] = (subjects['leadership'] || 0) + 1;
    }
    if (courseName.includes('research') || courseName.includes('thesis')) {
      subjects['research'] = (subjects['research'] || 0) + 1;
    }
    
    // Count advanced courses (400+ level or keywords like "advanced", "senior", "capstone")
    if (courseCode.match(/[4-9]\d\d/) || courseName.includes('advanced') || courseName.includes('senior') || courseName.includes('capstone')) {
      advancedCourses++;
    }
  });
  
  return {
    subjects,
    advancedCourses,
    diversityScore: Object.keys(subjects).length,
    totalCourses: courses.length
  };
};

const getSubjectStampId = (subject: string): string => {
  const subjectMap: { [key: string]: string } = {
    math: 'math',
    science: 'science',
    literature: 'literature',
    history: 'history',
    art: 'art',
    music: 'music',
    business: 'business',
    engineering: 'engineering',
    sports: 'sports',
    leadership: 'leadership',
    research: 'research'
  };
  return subjectMap[subject] || subject;
};

const generateDynamicStamps = (transcriptData: any): Stamp[] => {
  const dynamicStamps: Stamp[] = [];
  
  // Create stamps based on specific institution
  if (transcriptData.institution) {
    const institutionName = transcriptData.institution;
    dynamicStamps.push({
      id: `institution_${institutionName.toLowerCase().replace(/\s+/g, '_')}`,
      name: `${institutionName} Alumni`,
      icon: '🏛️',
      category: 'Achievement',
      description: `Graduated from ${institutionName}`,
      unlocked: true
    });
  }
  
  // Create stamps based on degree type
  if (transcriptData.degree) {
    const degree = transcriptData.degree;
    dynamicStamps.push({
      id: `degree_${degree.toLowerCase().replace(/\s+/g, '_')}`,
      name: `${degree} Graduate`,
      icon: '🎓',
      category: 'Achievement',
      description: `Earned ${degree}`,
      unlocked: true
    });
  }
  
  return dynamicStamps;
};

const createTranscriptSummary = (transcriptData: any): TranscriptSummary => {
  const coursesBySubject: { [key: string]: number } = {};
  const topGrades: string[] = [];
  const achievements: string[] = [];
  
  // Analyze courses if available
  if (transcriptData.courses) {
    const courseAnalysis = analyzeCourses(transcriptData.courses);
    Object.assign(coursesBySubject, courseAnalysis.subjects);
    
    // Find top grades (A or A+ grades)
    transcriptData.courses.forEach((course: any) => {
      if (course.grade === 'A' || course.grade === 'A+' || course.grade === 'A-') {
        topGrades.push(`${course.name}: ${course.grade}`);
      }
    });
  }
  
  // Determine achievements based on GPA
  const gpa = parseFloat(transcriptData.gpa || '0');
  if (gpa >= 3.9) achievements.push('Summa Cum Laude');
  else if (gpa >= 3.7) achievements.push('Magna Cum Laude');
  else if (gpa >= 3.5) achievements.push("Dean's List");
  else if (gpa >= 3.0) achievements.push('Honor Roll');
  
  if (transcriptData.graduationDate) achievements.push('Graduate');
  
  return {
    institution: transcriptData.institution,
    studentName: transcriptData.studentName,
    degree: transcriptData.degree,
    gpa: transcriptData.gpa,
    totalCredits: transcriptData.totalCredits,
    graduationDate: transcriptData.graduationDate,
    coursesBySubject,
    topGrades: topGrades.slice(0, 5), // Keep top 5
    achievements
  };
};

export default function DashboardScreen({ route, navigation }: any) {
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalScans: 0,
    stamps: [],
    achievements: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const analysisResult = route?.params?.analysisResult;

  useEffect(() => {
    loadUserProgress();
    if (analysisResult) {
      processTranscriptAnalysis(analysisResult);
    }
  }, []);

  const loadUserProgress = async () => {
    try {
      const savedProgress = await AsyncStorage.getItem('userProgress');
      if (savedProgress) {
        setUserProgress(JSON.parse(savedProgress));
      } else {
        // Initialize with default stamps
        const initialProgress: UserProgress = {
          totalScans: 0,
          stamps: AVAILABLE_STAMPS.map(stamp => ({ ...stamp })),
          achievements: [],
        };
        setUserProgress(initialProgress);
        await AsyncStorage.setItem('userProgress', JSON.stringify(initialProgress));
      }
    } catch (error) {
      console.error('Error loading user progress:', error);
    } finally {
      setLoading(false);
    }
  };

    const processTranscriptAnalysis = async (result: any) => {
    if (!result?.success || !result?.data) return;

    const transcriptData = result.data;
    const newStamps: string[] = [];
    const updatedStamps = userProgress.stamps.map(stamp => ({ ...stamp }));

    // Create dynamic stamps based on actual transcript data
    const dynamicStamps = generateDynamicStamps(transcriptData);
    
    // Merge dynamic stamps with existing stamps
    const allStamps = [...AVAILABLE_STAMPS, ...dynamicStamps];
    
    // Analyze transcript content to unlock stamps
    if (transcriptData.courses) {
      const courseAnalysis = analyzeCourses(transcriptData.courses);
      
      // Unlock stamps based on course analysis
      Object.keys(courseAnalysis.subjects).forEach(subject => {
        const count = courseAnalysis.subjects[subject];
        if (count >= 2) { // Unlock if 2+ courses in subject
          unlockStamp(updatedStamps, getSubjectStampId(subject), newStamps);
        }
      });

      // Advanced analysis stamps
      if (courseAnalysis.advancedCourses >= 5) {
        unlockStamp(updatedStamps, 'advanced_scholar', newStamps);
      }
      
      if (courseAnalysis.diversityScore >= 4) {
        unlockStamp(updatedStamps, 'well_rounded', newStamps);
      }

      // Check GPA for achievement stamps
      const gpa = parseFloat(transcriptData.gpa || '0');
      if (gpa >= 3.9) {
        unlockStamp(updatedStamps, 'summa_cum_laude', newStamps);
      } else if (gpa >= 3.7) {
        unlockStamp(updatedStamps, 'magna_cum_laude', newStamps);
      } else if (gpa >= 3.5) {
        unlockStamp(updatedStamps, 'dean_list', newStamps);
      } else if (gpa >= 3.0) {
        unlockStamp(updatedStamps, 'honor_roll', newStamps);
      }

      // Check if graduated
      if (transcriptData.graduationDate || transcriptData.degree) {
        unlockStamp(updatedStamps, 'graduate', newStamps);
        
        // Check degree level
        const degree = transcriptData.degree?.toLowerCase() || '';
        if (degree.includes('master') || degree.includes('mba') || degree.includes('ms')) {
          unlockStamp(updatedStamps, 'masters_graduate', newStamps);
        }
        if (degree.includes('phd') || degree.includes('doctorate')) {
          unlockStamp(updatedStamps, 'doctorate', newStamps);
        }
      }

      // Check total credits and course load
      const totalCredits = parseInt(transcriptData.totalCredits || '0');
      if (totalCredits >= 180) {
        unlockStamp(updatedStamps, 'overachiever', newStamps);
      } else if (totalCredits >= 120) {
        unlockStamp(updatedStamps, 'scholarship', newStamps);
      }

      // Institution-based stamps
      const institution = transcriptData.institution?.toLowerCase() || '';
      if (institution.includes('university') || institution.includes('college')) {
        unlockStamp(updatedStamps, 'college_graduate', newStamps);
      }
    }

    // Save transcript data for dashboard display
    const transcriptSummary = createTranscriptSummary(transcriptData);
    
    // Update user progress with transcript data
    const newProgress: UserProgress = {
      totalScans: userProgress.totalScans + 1,
      stamps: updatedStamps,
      achievements: [...userProgress.achievements, ...newStamps],
      transcriptData: transcriptSummary,
      lastScanDate: new Date().toISOString(),
    };

    setUserProgress(newProgress);
    await AsyncStorage.setItem('userProgress', JSON.stringify(newProgress));

    // Show congratulations for new stamps
    if (newStamps.length > 0) {
      const stampNames = newStamps.map(id => 
        allStamps.find(s => s.id === id)?.name || 'Unknown'
      ).join(', ');
      
      Alert.alert(
        '🎉 New Stamps Unlocked!',
        `Congratulations! You've earned: ${stampNames}`,
        [{ text: 'Awesome!', style: 'default' }]
      );
    }
  };

  const unlockStamp = (stamps: Stamp[], stampId: string, newStamps: string[]) => {
    const stampIndex = stamps.findIndex(s => s.id === stampId);
    if (stampIndex !== -1 && !stamps[stampIndex].unlocked) {
      stamps[stampIndex].unlocked = true;
      stamps[stampIndex].dateUnlocked = new Date().toLocaleDateString();
      newStamps.push(stampId);
    }
  };

  const categories = ['All', 'Academic', 'Achievement', 'Interest'];
  
  const filteredStamps = selectedCategory === 'All' 
    ? userProgress.stamps 
    : userProgress.stamps.filter(stamp => stamp.category === selectedCategory);

  const unlockedCount = userProgress.stamps.filter(s => s.unlocked).length;
  const totalCount = userProgress.stamps.length;
  const progressPercentage = Math.round((unlockedCount / totalCount) * 100);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎯 Your Achievement Dashboard</Text>
          <Text style={styles.subtitle}>Collect stamps based on your academic journey!</Text>
        </View>

        {/* Progress Overview */}
        <Card style={styles.progressCard}>
          <Card.Content>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{unlockedCount}</Text>
                <Text style={styles.statLabel}>Stamps Collected</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userProgress.totalScans}</Text>
                <Text style={styles.statLabel}>Transcripts Scanned</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{progressPercentage}%</Text>
                <Text style={styles.statLabel}>Collection Complete</Text>
              </View>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
            </View>
          </Card.Content>
        </Card>

        {/* Transcript Summary */}
        {userProgress.transcriptData && (
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text style={styles.summaryTitle}>📄 Your Academic Summary</Text>
              
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>🎓 Institution:</Text>
                  <Text style={styles.summaryValue}>{userProgress.transcriptData.institution || 'N/A'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📚 Degree:</Text>
                  <Text style={styles.summaryValue}>{userProgress.transcriptData.degree || 'N/A'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>📊 GPA:</Text>
                  <Text style={[styles.summaryValue, styles.gpaValue]}>{userProgress.transcriptData.gpa || 'N/A'}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>🏆 Credits:</Text>
                  <Text style={styles.summaryValue}>{userProgress.transcriptData.totalCredits || 'N/A'}</Text>
                </View>
              </View>

              {/* Subject Distribution */}
              {Object.keys(userProgress.transcriptData.coursesBySubject).length > 0 && (
                <View style={styles.subjectSection}>
                  <Text style={styles.subjectTitle}>📖 Subjects Studied</Text>
                  <View style={styles.subjectGrid}>
                    {Object.entries(userProgress.transcriptData.coursesBySubject).map(([subject, count]) => (
                      <View key={subject} style={styles.subjectBadge}>
                        <Text style={styles.subjectName}>{subject}</Text>
                        <Text style={styles.subjectCount}>{count} courses</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Achievements */}
              {userProgress.transcriptData.achievements.length > 0 && (
                <View style={styles.achievementSection}>
                  <Text style={styles.achievementTitle}>🏅 Academic Achievements</Text>
                  <View style={styles.achievementList}>
                    {userProgress.transcriptData.achievements.map((achievement, index) => (
                      <Text key={index} style={styles.achievementItem}>• {achievement}</Text>
                    ))}
                  </View>
                </View>
              )}

              {/* Top Grades */}
              {userProgress.transcriptData.topGrades.length > 0 && (
                <View style={styles.gradesSection}>
                  <Text style={styles.gradesTitle}>⭐ Top Performance</Text>
                  <View style={styles.gradesList}>
                    {userProgress.transcriptData.topGrades.slice(0, 3).map((grade, index) => (
                      <Text key={index} style={styles.gradeItem}>🌟 {grade}</Text>
                    ))}
                  </View>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Category Filter */}
        <View style={styles.categoryFilter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map(category => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextActive
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Stamps Grid */}
        <View style={styles.stampsGrid}>
          {filteredStamps.map(stamp => (
            <TouchableOpacity
              key={stamp.id}
              style={[
                styles.stampCard,
                stamp.unlocked ? styles.stampCardUnlocked : styles.stampCardLocked
              ]}
              onPress={() => {
                Alert.alert(
                  stamp.name,
                  `${stamp.description}\n\n${stamp.unlocked 
                    ? `Unlocked on: ${stamp.dateUnlocked}` 
                    : 'Complete relevant courses to unlock this stamp!'
                  }`
                );
              }}
            >
              <Text style={[
                styles.stampIcon,
                !stamp.unlocked && styles.stampIconLocked
              ]}>
                {stamp.unlocked ? stamp.icon : '🔒'}
              </Text>
              <Text style={[
                styles.stampName,
                !stamp.unlocked && styles.stampNameLocked
              ]}>
                {stamp.name}
              </Text>
              <View style={[
                styles.categoryBadge,
                { backgroundColor: getCategoryColor(stamp.category) }
              ]}>
                <Text style={styles.categoryBadgeText}>{stamp.category}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            style={styles.scanButton}
            onPress={() => navigation.navigate('Home')}
            icon="camera"
          >
            Scan Another Transcript
          </Button>
          
          <Button
            mode="outlined"
            style={styles.voiceButton}
            onPress={() => navigation.navigate('Blue')}
            icon="microphone"
          >
            Try Voice Transcription
          </Button>
        </View>

        {/* Tips Section */}
        <Card style={styles.tipsCard}>
          <Card.Content>
            <Text style={styles.tipsTitle}>💡 Tips to Collect More Stamps</Text>
            <Text style={styles.tipsText}>
              • Scan transcripts with diverse course subjects{'\n'}
              • Higher GPAs unlock achievement stamps{'\n'}
              • Complete degrees to unlock graduation stamps{'\n'}
              • Look for courses in technology, arts, and sciences
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'Academic': return '#4CAF50';
    case 'Achievement': return '#FF9800';
    case 'Interest': return '#2196F3';
    default: return '#9E9E9E';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E3F2FD',
    textAlign: 'center',
    marginTop: 5,
  },
  progressCard: {
    margin: 20,
    elevation: 4,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  categoryFilter: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  categoryButtonActive: {
    backgroundColor: '#2196F3',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  stampsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
  },
  stampCard: {
    width: (width - 50) / 2,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  stampCardUnlocked: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  stampCardLocked: {
    opacity: 0.6,
  },
  stampIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  stampIconLocked: {
    opacity: 0.5,
  },
  stampName: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 32,
  },
  stampNameLocked: {
    color: '#999',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 5,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  actionButtons: {
    padding: 20,
    gap: 10,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
  },
  voiceButton: {
    borderColor: '#2196F3',
  },
  tipsCard: {
    margin: 20,
    marginTop: 0,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  summaryCard: {
    margin: 20,
    marginTop: 0,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  gpaValue: {
    color: '#4CAF50',
    fontSize: 16,
  },
  subjectSection: {
    marginBottom: 15,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
    textTransform: 'capitalize',
  },
  subjectCount: {
    fontSize: 10,
    color: '#666',
  },
  achievementSection: {
    marginBottom: 15,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  achievementList: {
    paddingLeft: 10,
  },
  achievementItem: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 4,
    fontWeight: '500',
  },
  gradesSection: {
    marginBottom: 10,
  },
  gradesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  gradesList: {
    paddingLeft: 10,
  },
  gradeItem: {
    fontSize: 14,
    color: '#FF9800',
    marginBottom: 4,
    fontWeight: '500',
  },
});