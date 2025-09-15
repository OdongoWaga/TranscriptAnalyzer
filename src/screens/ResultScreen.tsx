import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  DataTable,
  Chip,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { AnalysisResult, TranscriptAnalysis, Course } from '../types';

type RootStackParamList = {
  Home: undefined;
  Result: { result: AnalysisResult };
};

type ResultScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Result'>;
type ResultScreenRouteProp = RouteProp<RootStackParamList, 'Result'>;

interface Props {
  navigation: ResultScreenNavigationProp;
  route: ResultScreenRouteProp;
}

export default function ResultScreen({ navigation, route }: Props) {
  const { result } = route.params;
  const data = result.data;

  const handleShare = async () => {
    if (!data) return;

    try {
      const shareText = generateShareText(data);
      await Share.share({
        message: shareText,
        title: 'My Transcript Analysis',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share results');
    }
  };

  const generateShareText = (transcriptData: TranscriptAnalysis): string => {
    let text = '📚 Academic Transcript Analysis\n\n';
    
    if (transcriptData.institution) {
      text += `🏫 Institution: ${transcriptData.institution}\n`;
    }
    if (transcriptData.studentName) {
      text += `👤 Student: ${transcriptData.studentName}\n`;
    }
    if (transcriptData.degree) {
      text += `🎓 Degree: ${transcriptData.degree}\n`;
    }
    if (transcriptData.gpa) {
      text += `📊 GPA: ${transcriptData.gpa}\n`;
    }
    if (transcriptData.totalCredits) {
      text += `📝 Total Credits: ${transcriptData.totalCredits}\n`;
    }
    if (transcriptData.graduationDate) {
      text += `🎉 Graduation Date: ${transcriptData.graduationDate}\n`;
    }
    
    text += '\n📋 Courses:\n';
    transcriptData.courses.forEach((course, index) => {
      text += `${index + 1}. ${course.code} - ${course.name}\n`;
      text += `   Grade: ${course.grade} | Credits: ${course.credits}\n`;
      if (course.semester && course.year) {
        text += `   ${course.semester} ${course.year}\n`;
      }
      text += '\n';
    });
    
    return text;
  };

  const getGradeColor = (grade: string): string => {
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper.includes('A') || gradeUpper.includes('4.0')) return '#4CAF50';
    if (gradeUpper.includes('B') || gradeUpper.includes('3.0')) return '#FF9800';
    if (gradeUpper.includes('C') || gradeUpper.includes('2.0')) return '#FF5722';
    if (gradeUpper.includes('D') || gradeUpper.includes('1.0')) return '#F44336';
    if (gradeUpper.includes('F') || gradeUpper.includes('0.0')) return '#9C27B0';
    return '#757575';
  };

  if (!result.success || !data) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient colors={['#f44336', '#d32f2f']} style={styles.gradient}>
          <Card style={styles.errorCard}>
            <Card.Content>
              <Title style={styles.errorTitle}>Analysis Failed</Title>
              <Paragraph style={styles.errorText}>
                {result.error || 'Unable to analyze the transcript. Please try again with a clearer image.'}
              </Paragraph>
              <Button
                mode="contained"
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                Try Again
              </Button>
            </Card.Content>
          </Card>
        </LinearGradient>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#4CAF50', '#388E3C']} style={styles.gradient}>
        <View style={styles.content}>
          {/* Header Information */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Transcript Analysis Complete</Title>
              <Paragraph style={styles.subtitle}>
                Successfully extracted information from your transcript
              </Paragraph>
            </Card.Content>
          </Card>

          {/* Student Information */}
          {(data.institution || data.studentName || data.degree || data.graduationDate) && (
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Student Information</Title>
                <View style={styles.infoGrid}>
                  {data.institution && (
                    <View style={styles.infoItem}>
                      <Paragraph style={styles.infoLabel}>Institution</Paragraph>
                      <Paragraph style={styles.infoValue}>{data.institution}</Paragraph>
                    </View>
                  )}
                  {data.studentName && (
                    <View style={styles.infoItem}>
                      <Paragraph style={styles.infoLabel}>Student Name</Paragraph>
                      <Paragraph style={styles.infoValue}>{data.studentName}</Paragraph>
                    </View>
                  )}
                  {data.degree && (
                    <View style={styles.infoItem}>
                      <Paragraph style={styles.infoLabel}>Degree</Paragraph>
                      <Paragraph style={styles.infoValue}>{data.degree}</Paragraph>
                    </View>
                  )}
                  {data.graduationDate && (
                    <View style={styles.infoItem}>
                      <Paragraph style={styles.infoLabel}>Graduation Date</Paragraph>
                      <Paragraph style={styles.infoValue}>{data.graduationDate}</Paragraph>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Academic Summary */}
          {(data.gpa || data.totalCredits) && (
            <Card style={styles.card}>
              <Card.Content>
                <Title style={styles.sectionTitle}>Academic Summary</Title>
                <View style={styles.summaryContainer}>
                  {data.gpa && (
                    <Chip
                      icon="chart-line"
                      style={[styles.summaryChip, { backgroundColor: '#2196F3' }]}
                      textStyle={styles.summaryChipText}
                    >
                      GPA: {data.gpa}
                    </Chip>
                  )}
                  {data.totalCredits && (
                    <Chip
                      icon="book-open-variant"
                      style={[styles.summaryChip, { backgroundColor: '#4CAF50' }]}
                      textStyle={styles.summaryChipText}
                    >
                      Credits: {data.totalCredits}
                    </Chip>
                  )}
                </View>
              </Card.Content>
            </Card>
          )}

          {/* Courses Table */}
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Course Details</Title>
              <Paragraph style={styles.courseCount}>
                {data.courses.length} course{data.courses.length !== 1 ? 's' : ''} found
              </Paragraph>
              
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Course</DataTable.Title>
                  <DataTable.Title>Name</DataTable.Title>
                  <DataTable.Title numeric>Grade</DataTable.Title>
                  <DataTable.Title numeric>Credits</DataTable.Title>
                </DataTable.Header>

                {data.courses.map((course: Course, index: number) => (
                  <DataTable.Row key={index}>
                    <DataTable.Cell>
                      <Paragraph style={styles.courseCode}>{course.code}</Paragraph>
                    </DataTable.Cell>
                    <DataTable.Cell>
                      <Paragraph style={styles.courseName} numberOfLines={2}>
                        {course.name}
                      </Paragraph>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Chip
                        style={[
                          styles.gradeChip,
                          { backgroundColor: getGradeColor(course.grade) }
                        ]}
                        textStyle={styles.gradeChipText}
                      >
                        {course.grade}
                      </Chip>
                    </DataTable.Cell>
                    <DataTable.Cell numeric>
                      <Paragraph style={styles.credits}>{course.credits}</Paragraph>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card.Content>
          </Card>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleShare}
              style={[styles.actionButton, styles.shareButton]}
              icon="share"
            >
              Share Results
            </Button>
            
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Home')}
              style={[styles.actionButton, styles.newAnalysisButton]}
              textColor="#4CAF50"
            >
              Analyze Another
            </Button>
          </View>
        </View>
      </LinearGradient>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  gradient: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  sectionTitle: {
    color: '#2E7D32',
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoItem: {
    width: '48%',
    marginBottom: 12,
  },
  infoLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoValue: {
    color: '#333',
    fontSize: 14,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  summaryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  summaryChipText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  courseCount: {
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  courseCode: {
    fontWeight: 'bold',
    color: '#333',
  },
  courseName: {
    color: '#666',
    fontSize: 12,
  },
  gradeChip: {
    minWidth: 40,
  },
  gradeChipText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  credits: {
    color: '#333',
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginTop: 16,
  },
  actionButton: {
    marginVertical: 8,
    paddingVertical: 8,
  },
  shareButton: {
    backgroundColor: '#2196F3',
  },
  newAnalysisButton: {
    borderColor: '#4CAF50',
  },
  errorContainer: {
    flex: 1,
  },
  errorCard: {
    margin: 16,
    elevation: 4,
  },
  errorTitle: {
    color: '#d32f2f',
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#f44336',
    marginTop: 16,
  },
});
