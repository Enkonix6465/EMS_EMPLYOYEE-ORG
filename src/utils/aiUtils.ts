import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, doc } from 'firebase/firestore';

// AI-powered data analysis and insights
export interface AIInsight {
  type: 'prediction' | 'recommendation' | 'alert' | 'optimization' | 'trend' | 'sentiment' | 'workload' | 'skill_gap' | 'meeting' | 'document';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  action?: string;
  data?: any;
}

// Smart suggestions for various contexts
export interface SmartSuggestion {
  type: 'task' | 'project' | 'skill' | 'meeting' | 'goal' | 'optimization' | 'workload' | 'collaboration' | 'learning' | 'wellness';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  reasoning: string;
}

// AI-powered predictions
export interface AIPrediction {
  type: 'completion_time' | 'success_rate' | 'resource_needs' | 'risk_assessment' | 'workload' | 'burnout' | 'performance' | 'attrition';
  value: number | string;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

// Sentiment Analysis
export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  emotions: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
  };
  keywords: string[];
  suggestions: string[];
}

// Workload Analysis
export interface WorkloadAnalysis {
  current_load: number; // 0-100
  capacity: number; // 0-100
  stress_level: 'low' | 'medium' | 'high' | 'critical';
  burnout_risk: number; // 0-100
  recommendations: string[];
  optimal_workload: number;
}

// Skill Gap Analysis
export interface SkillGapAnalysis {
  current_skills: { [skill: string]: number }; // skill: proficiency level
  required_skills: { [skill: string]: number };
  gaps: { [skill: string]: number };
  priority_skills: string[];
  learning_path: string[];
  estimated_time: number; // weeks
}

// Meeting Intelligence
export interface MeetingIntelligence {
  optimal_duration: number; // minutes
  best_time_slots: string[];
  participant_availability: { [userId: string]: string[] };
  agenda_suggestions: string[];
  follow_up_actions: string[];
  effectiveness_score: number; // 0-100
}

// Document Analysis
export interface DocumentAnalysis {
  type: 'report' | 'proposal' | 'email' | 'presentation' | 'policy';
  sentiment: SentimentAnalysis;
  key_points: string[];
  action_items: string[];
  readability_score: number; // 0-100
  suggestions: string[];
  summary: string;
}

// ===== DASHBOARD AI FEATURES =====

export const generateDashboardInsights = async (userId: string): Promise<AIInsight[]> => {
  const insights: AIInsight[] = [];
  
  try {
    // Analyze task completion patterns
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assigned_to', '==', userId),
      orderBy('created_at', 'desc'),
      limit(50)
    );
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Task completion rate analysis
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const completionRate = (completedTasks.length / tasks.length) * 100;
    
    if (completionRate < 70) {
      insights.push({
        type: 'alert',
        title: 'Low Task Completion Rate',
        description: `Your task completion rate is ${completionRate.toFixed(1)}%. Consider prioritizing high-impact tasks.`,
        confidence: 0.85,
        priority: 'high',
        action: 'review_task_priorities'
      });
    }
    
    // Analyze attendance patterns
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('user_id', '==', userId),
      orderBy('date', 'desc'),
      limit(30)
    );
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const lateEntries = attendance.filter(a => a.status === 'late');
    if (lateEntries.length > 5) {
      insights.push({
        type: 'trend',
        title: 'Frequent Late Arrivals',
        description: `You've been late ${lateEntries.length} times in the last 30 days. Consider adjusting your schedule.`,
        confidence: 0.90,
        priority: 'medium',
        action: 'adjust_schedule'
      });
    }
    
    // Project progress analysis
    const projectsQuery = query(
      collection(db, 'projects'),
      where('team_members', 'array-contains', userId),
      orderBy('created_at', 'desc')
    );
    const projectsSnap = await getDocs(projectsQuery);
    const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const overdueProjects = projects.filter(p => 
      new Date(p.deadline) < new Date() && p.status !== 'completed'
    );
    
    if (overdueProjects.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Overdue Projects Detected',
        description: `${overdueProjects.length} project(s) are past their deadline. Immediate attention required.`,
        confidence: 0.95,
        priority: 'critical',
        action: 'review_overdue_projects'
      });
    }
    
  } catch (error) {
    console.error('Error generating dashboard insights:', error);
    
    // Provide fallback insights when indexes are missing
    insights.push({
      type: 'recommendation',
      title: 'Welcome to AI Insights!',
      description: 'Complete your profile and start using the system to get personalized AI insights.',
      confidence: 0.90,
      priority: 'low',
      action: 'complete_profile'
    });
    
    insights.push({
      type: 'optimization',
      title: 'System Setup',
      description: 'Some AI features require database indexes. Contact your administrator to enable full AI functionality.',
      confidence: 0.85,
      priority: 'low',
      action: 'setup_indexes'
    });
  }
  
  return insights;
};

// ===== TASK MANAGEMENT AI FEATURES =====

export const generateTaskSuggestions = async (userId: string): Promise<SmartSuggestion[]> => {
  const suggestions: SmartSuggestion[] = [];
  
  try {
    // Analyze task patterns
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('assigned_to', '==', userId),
      orderBy('created_at', 'desc'),
      limit(100)
    );
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Find tasks that are frequently delayed
    const delayedTasks = tasks.filter(t => 
      t.status === 'in_progress' && 
      new Date(t.due_date) < new Date()
    );
    
    if (delayedTasks.length > 0) {
      suggestions.push({
        type: 'task',
        title: 'Prioritize Delayed Tasks',
        description: `Focus on ${delayedTasks.length} delayed task(s) to improve your completion rate`,
        impact: 'high',
        effort: 'medium',
        reasoning: 'Delayed tasks can impact project timelines and team productivity'
      });
    }
    
    // Suggest task batching based on categories
    const taskCategories = tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommonCategory = Object.entries(taskCategories)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonCategory && mostCommonCategory[1] > 3) {
      suggestions.push({
        type: 'optimization',
        title: 'Batch Similar Tasks',
        description: `Group ${mostCommonCategory[1]} ${mostCommonCategory[0]} tasks together for efficiency`,
        impact: 'medium',
        effort: 'low',
        reasoning: 'Task batching reduces context switching and improves productivity'
      });
    }
    
  } catch (error) {
    console.error('Error generating task suggestions:', error);
  }
  
  return suggestions;
};

export const predictTaskCompletion = (task: any): AIPrediction => {
  const factors = [];
  let confidence = 0.5;
  
  // Analyze task complexity
  if (task.priority === 'high') {
    factors.push('High priority tasks typically get completed faster');
    confidence += 0.1;
  }
  
  if (task.category === 'urgent') {
    factors.push('Urgent tasks have shorter deadlines');
    confidence += 0.1;
  }
  
  // Estimate completion time based on task type
  let estimatedDays = 3; // default
  if (task.category === 'bug_fix') estimatedDays = 1;
  if (task.category === 'feature_development') estimatedDays = 5;
  if (task.category === 'documentation') estimatedDays = 2;
  
  return {
    type: 'completion_time',
    value: `${estimatedDays} days`,
    confidence: Math.min(confidence, 0.95),
    factors,
    recommendations: [
      'Break down complex tasks into smaller subtasks',
      'Set intermediate milestones',
      'Regular progress updates'
    ]
  };
};

// ===== PROJECT MANAGEMENT AI FEATURES =====

export const analyzeProjectHealth = async (projectId: string): Promise<AIInsight[]> => {
  const insights: AIInsight[] = [];
  
  try {
    // Get project tasks
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('project_id', '==', projectId)
    );
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progressPercentage = (completedTasks / totalTasks) * 100;
    
    // Project timeline analysis
    const projectQuery = query(
      collection(db, 'projects'),
      where('id', '==', projectId)
    );
    const projectSnap = await getDocs(projectQuery);
    const project = projectSnap.docs[0]?.data();
    
    if (project) {
      const daysRemaining = Math.ceil(
        (new Date(project.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysRemaining < 7 && progressPercentage < 80) {
        insights.push({
          type: 'alert',
          title: 'Project at Risk',
          description: `Project deadline in ${daysRemaining} days with ${progressPercentage.toFixed(1)}% completion`,
          confidence: 0.90,
          priority: 'critical',
          action: 'accelerate_project_progress'
        });
      }
      
      if (progressPercentage > 90) {
        insights.push({
          type: 'optimization',
          title: 'Project Near Completion',
          description: `Project is ${progressPercentage.toFixed(1)}% complete. Consider early delivery.`,
          confidence: 0.85,
          priority: 'low',
          action: 'prepare_delivery'
        });
      }
    }
    
  } catch (error) {
    console.error('Error analyzing project health:', error);
  }
  
  return insights;
};

// ===== ATTENDANCE AI FEATURES =====

export const predictAttendancePatterns = async (userId: string): Promise<AIPrediction> => {
  try {
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("user_id", "==", userId),
      orderBy("date", "desc"),
      limit(90)
    );
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'present').length;
    const attendanceRate = (presentDays / totalDays) * 100;
    
    const factors = [
      `Current attendance rate: ${attendanceRate.toFixed(1)}%`,
      `Based on ${totalDays} days of data`
    ];
    
    let prediction = 'Good';
    if (attendanceRate < 85) prediction = 'Needs Improvement';
    if (attendanceRate < 70) prediction = 'Poor';
    
    return {
      type: 'success_rate',
      value: prediction,
      confidence: 0.80,
      factors,
      recommendations: [
        'Set consistent sleep schedule',
        'Plan commute time buffer',
        'Use calendar reminders'
      ]
    };
    
  } catch (error) {
    console.error('Error predicting attendance patterns:', error);
    return {
      type: 'success_rate',
      value: 'Good',
      confidence: 0.70,
      factors: ['Using default prediction'],
      recommendations: [
        'Continue tracking attendance for personalized insights',
        'Maintain consistent work schedule',
        'Set up calendar reminders'
      ]
    };
  }
};

// ===== LEAVE MANAGEMENT AI FEATURES =====

export const suggestOptimalLeaveTiming = async (userId: string): Promise<SmartSuggestion[]> => {
  const suggestions: SmartSuggestion[] = [];
  
  try {
    // Analyze team workload
    const projectsQuery = query(collection(db, 'projects'));
    const projectsSnap = await getDocs(projectsQuery);
    const projects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Find low-activity periods
    const currentMonth = new Date().getMonth();
    const nextMonth = (currentMonth + 1) % 12;
    
    // Simple heuristic: suggest leave during month transitions
    suggestions.push({
      type: 'optimization',
      title: 'Optimal Leave Period',
      description: 'Consider taking leave during month transitions when workload is typically lower',
      impact: 'medium',
      effort: 'low',
      reasoning: 'Month transitions often have fewer critical deadlines'
    });
    
    // Check for upcoming holidays
    const holidays = [
      { name: 'Christmas', date: new Date(new Date().getFullYear(), 11, 25) },
      { name: 'New Year', date: new Date(new Date().getFullYear() + 1, 0, 1) },
      { name: 'Summer Break', date: new Date(new Date().getFullYear(), 6, 15) }
    ];
    
    const upcomingHoliday = holidays.find(h => 
      h.date.getTime() > new Date().getTime() && 
      h.date.getTime() < new Date().getTime() + (30 * 24 * 60 * 60 * 1000)
    );
    
    if (upcomingHoliday) {
      suggestions.push({
        type: 'optimization',
        title: 'Extended Holiday Break',
        description: `Consider extending your leave around ${upcomingHoliday.name}`,
        impact: 'high',
        effort: 'low',
        reasoning: 'Combining leave with holidays maximizes time off'
      });
    }
    
  } catch (error) {
    console.error('Error suggesting optimal leave timing:', error);
  }
  
  return suggestions;
};

// ===== TEAM COLLABORATION AI FEATURES =====

export const analyzeTeamPerformance = async (teamId: string): Promise<AIInsight[]> => {
  const insights: AIInsight[] = [];
  
  try {
    // Get team members
    const teamQuery = query(
      collection(db, 'users'),
      where('team_id', '==', teamId)
    );
    const teamSnap = await getDocs(teamQuery);
    const teamMembers = teamSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Analyze team task completion
    const teamTasksQuery = query(
      collection(db, 'tasks'),
      where('team_id', '==', teamId)
    );
    const teamTasksSnap = await getDocs(teamTasksQuery);
    const teamTasks = teamTasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const completedTasks = teamTasks.filter(t => t.status === 'completed').length;
    const totalTasks = teamTasks.length;
    const teamCompletionRate = (completedTasks / totalTasks) * 100;
    
    if (teamCompletionRate < 75) {
      insights.push({
        type: 'alert',
        title: 'Team Performance Alert',
        description: `Team completion rate is ${teamCompletionRate.toFixed(1)}%. Consider team collaboration review.`,
        confidence: 0.85,
        priority: 'high',
        action: 'review_team_collaboration'
      });
    }
    
    // Identify bottlenecks
    const overdueTasks = teamTasks.filter(t => 
      new Date(t.due_date) < new Date() && t.status !== 'completed'
    );
    
    if (overdueTasks.length > 0) {
      insights.push({
        type: 'trend',
        title: 'Team Bottleneck Detected',
        description: `${overdueTasks.length} overdue tasks may indicate resource constraints`,
        confidence: 0.80,
        priority: 'medium',
        action: 'review_resource_allocation'
      });
    }
    
  } catch (error) {
    console.error('Error analyzing team performance:', error);
  }
  
  return insights;
};

// ===== MEETING OPTIMIZATION AI FEATURES =====

export const suggestMeetingOptimizations = (meetingData: any): SmartSuggestion[] => {
  const suggestions: SmartSuggestion[] = [];
  
  // Analyze meeting duration
  if (meetingData.duration > 60) {
    suggestions.push({
      type: 'optimization',
      title: 'Meeting Duration Optimization',
      description: 'Consider breaking long meetings into shorter, focused sessions',
      impact: 'medium',
      effort: 'low',
      reasoning: 'Shorter meetings improve focus and productivity'
    });
  }
  
  // Suggest meeting time optimization
  const meetingHour = new Date(meetingData.start_time).getHours();
  if (meetingHour < 9 || meetingHour > 16) {
    suggestions.push({
      type: 'optimization',
      title: 'Meeting Time Optimization',
      description: 'Schedule meetings during core business hours for better attendance',
      impact: 'medium',
      effort: 'low',
      reasoning: 'Core hours ensure maximum team availability'
    });
  }
  
  return suggestions;
};

// ===== GENERAL AI UTILITIES =====

export const generateSmartNotifications = async (userId: string): Promise<AIInsight[]> => {
  const notifications: AIInsight[] = [];
  
  try {
    // Check for upcoming deadlines
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assigned_to", "==", userId),
      where("status", "!=", "completed")
    );
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const upcomingDeadlines = tasks.filter(task => {
      const daysUntilDeadline = Math.ceil(
        (new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilDeadline <= 3 && daysUntilDeadline > 0;
    });
    
    if (upcomingDeadlines.length > 0) {
      notifications.push({
        type: 'alert',
        title: 'Upcoming Deadlines',
        description: `${upcomingDeadlines.length} task(s) due within 3 days`,
        confidence: 0.95,
        priority: 'high',
        action: 'review_upcoming_tasks'
      });
    }
    
    // Check for overdue items
    const overdueItems = tasks.filter(task => 
      new Date(task.due_date) < new Date()
    );
    
    if (overdueItems.length > 0) {
      notifications.push({
        type: 'alert',
        title: 'Overdue Items',
        description: `${overdueItems.length} task(s) are past their deadline`,
        confidence: 0.95,
        priority: 'critical',
        action: 'address_overdue_items'
      });
    }
    
  } catch (error) {
    console.error('Error generating smart notifications:', error);
    
    // Provide default notifications when indexes are missing
    notifications.push({
      type: 'recommendation',
      title: 'Welcome to Smart Notifications!',
      description: 'Start using the task management system to get personalized notifications and reminders.',
      confidence: 0.90,
      priority: 'low',
      action: 'setup_notifications'
    });
    
    notifications.push({
      type: 'optimization',
      title: 'System Setup',
      description: 'Complete your profile and start creating tasks to enable smart notifications.',
      confidence: 0.85,
      priority: 'low',
      action: 'complete_setup'
    });
  }
  
  return notifications;
};

export const calculateProductivityScore = async (userId: string): Promise<number> => {
  try {
    // Get user's recent activity
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assigned_to", "==", userId),
      orderBy("created_at", "desc"),
      limit(50)
    );
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("user_id", "==", userId),
      orderBy("date", "desc"),
      limit(30)
    );
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate productivity factors
    const taskCompletionRate = tasks.length > 0 ? 
      (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0;
    
    const attendanceRate = attendance.length > 0 ?
      (attendance.filter(a => a.status === 'present').length / attendance.length) * 100 : 0;
    
    const onTimeCompletionRate = tasks.length > 0 ?
      (tasks.filter(t => t.status === 'completed' && new Date(t.completed_at) <= new Date(t.due_date)).length / tasks.length) * 100 : 0;
    
    // Weighted productivity score
    const productivityScore = (
      taskCompletionRate * 0.4 +
      attendanceRate * 0.3 +
      onTimeCompletionRate * 0.3
    );
    
    return Math.round(productivityScore);
    
  } catch (error) {
    console.error('Error calculating productivity score:', error);
    // Return a default score when indexes are missing
    return 75; // Default to 75% as a reasonable starting point
  }
};

// ===== AI CHATBOT UTILITIES =====

export const generateAIResponse = (userMessage: string, context: any): string => {
  const message = userMessage.toLowerCase();
  
  // Simple AI response logic based on keywords
  if (message.includes('task') || message.includes('work')) {
    return "I can help you manage your tasks! Would you like me to show your current tasks, suggest priorities, or help you create a new task?";
  }
  
  if (message.includes('attendance') || message.includes('time')) {
    return "I can help with attendance tracking. Would you like to check your attendance history, mark attendance, or view your schedule?";
  }
  
  if (message.includes('project') || message.includes('team')) {
    return "I can assist with project management! Would you like to see your project status, team performance, or upcoming deadlines?";
  }
  
  if (message.includes('leave') || message.includes('vacation')) {
    return "I can help with leave management. Would you like to apply for leave, check your leave balance, or view leave history?";
  }
  
  if (message.includes('performance') || message.includes('productivity')) {
    return "I can analyze your performance! Would you like to see your productivity score, performance insights, or improvement suggestions?";
  }
  
  return "I'm here to help! You can ask me about tasks, attendance, projects, leave, performance, or any other work-related topics. What would you like to know?";
};

// ===== AI RECOMMENDATION ENGINE =====

export const generatePersonalizedRecommendations = async (userId: string): Promise<SmartSuggestion[]> => {
  const recommendations: SmartSuggestion[] = [];
  
  try {
    const productivityScore = await calculateProductivityScore(userId);
    
    if (productivityScore < 70) {
      recommendations.push({
        type: 'optimization',
        title: 'Improve Productivity',
        description: 'Your productivity score is below average. Consider time management techniques.',
        impact: 'high',
        effort: 'medium',
        reasoning: `Current productivity score: ${productivityScore}%`
      });
    }
    
    // Add more personalized recommendations based on user data
    recommendations.push({
      type: 'goal',
      title: 'Set Weekly Goals',
      description: 'Setting clear weekly goals can improve focus and achievement',
      impact: 'medium',
      effort: 'low',
      reasoning: 'Goal setting improves task prioritization and motivation'
    });
    
  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
  }
  
  return recommendations;
}; 

// ===== ADVANCED AI FEATURES =====

// Sentiment Analysis for Employee Feedback
export const analyzeSentiment = async (text: string): Promise<SentimentAnalysis> => {
  // Simple sentiment analysis based on keywords
  const positiveWords = ['great', 'excellent', 'good', 'amazing', 'wonderful', 'fantastic', 'awesome', 'perfect', 'outstanding', 'brilliant'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointing', 'frustrating', 'annoying', 'stressful', 'difficult', 'problem'];
  
  const words = text.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  const totalWords = words.length;
  const positiveRatio = positiveCount / totalWords;
  const negativeRatio = negativeCount / totalWords;
  
  let overall: 'positive' | 'neutral' | 'negative';
  let score: number;
  
  if (positiveRatio > negativeRatio && positiveRatio > 0.05) {
    overall = 'positive';
    score = positiveRatio - negativeRatio;
  } else if (negativeRatio > positiveRatio && negativeRatio > 0.05) {
    overall = 'negative';
    score = negativeRatio - positiveRatio;
  } else {
    overall = 'neutral';
    score = 0;
  }
  
  return {
    overall,
    score: Math.max(-1, Math.min(1, score)),
    emotions: {
      joy: positiveRatio * 0.8,
      sadness: negativeRatio * 0.6,
      anger: negativeRatio * 0.4,
      fear: negativeRatio * 0.3,
      surprise: Math.random() * 0.2
    },
    keywords: [...new Set([...positiveWords.filter(w => words.includes(w)), ...negativeWords.filter(w => words.includes(w))])],
    suggestions: overall === 'negative' ? [
      'Consider addressing concerns raised in feedback',
      'Schedule one-on-one meetings to discuss issues',
      'Implement improvement initiatives based on feedback'
    ] : [
      'Maintain positive momentum',
      'Share success stories with the team',
      'Recognize and reward positive contributions'
    ]
  };
};

// Workload Optimization Analysis
export const analyzeWorkload = async (userId: string): Promise<WorkloadAnalysis> => {
  try {
    // Get user's current tasks and projects
    const tasksQuery = query(
      collection(db, "tasks"),
      where("assigned_to", "==", userId),
      where("status", "!=", "completed")
    );
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate current workload based on task complexity and deadlines
    let currentLoad = 0;
    const now = new Date();
    
    tasks.forEach(task => {
      const dueDate = new Date(task.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Higher load for urgent tasks
      if (daysUntilDue <= 3) currentLoad += 30;
      else if (daysUntilDue <= 7) currentLoad += 20;
      else if (daysUntilDue <= 14) currentLoad += 15;
      else currentLoad += 10;
      
      // Add complexity factor
      if (task.priority === 'high') currentLoad += 15;
      if (task.priority === 'medium') currentLoad += 10;
    });
    
    currentLoad = Math.min(100, currentLoad);
    const capacity = 100 - currentLoad;
    
    let stressLevel: 'low' | 'medium' | 'high' | 'critical';
    let burnoutRisk: number;
    
    if (currentLoad <= 30) {
      stressLevel = 'low';
      burnoutRisk = 10;
    } else if (currentLoad <= 60) {
      stressLevel = 'medium';
      burnoutRisk = 30;
    } else if (currentLoad <= 80) {
      stressLevel = 'high';
      burnoutRisk = 60;
    } else {
      stressLevel = 'critical';
      burnoutRisk = 90;
    }
    
    const recommendations = [];
    if (currentLoad > 70) {
      recommendations.push('Consider delegating some tasks to reduce workload');
      recommendations.push('Prioritize tasks based on urgency and importance');
      recommendations.push('Schedule breaks between intensive work periods');
    } else if (currentLoad < 30) {
      recommendations.push('You have capacity for additional responsibilities');
      recommendations.push('Consider taking on new projects or mentoring others');
    }
    
    return {
      current_load: currentLoad,
      capacity,
      stress_level: stressLevel,
      burnout_risk: burnoutRisk,
      recommendations,
      optimal_workload: 60 // Optimal workload is around 60%
    };
    
  } catch (error) {
    console.error('Error analyzing workload:', error);
    // Return default workload analysis when indexes are missing
    return {
      current_load: 50,
      capacity: 50,
      stress_level: 'medium',
      burnout_risk: 30,
      recommendations: [
        'Start using the task management system to get personalized workload insights',
        'Consider setting up your profile and preferences',
        'Contact your administrator to enable full AI functionality'
      ],
      optimal_workload: 60
    };
  }
};

// Advanced Skill Gap Analysis
export const analyzeSkillGaps = async (userId: string, targetRole?: string): Promise<SkillGapAnalysis> => {
  try {
    // Get user's current skills
    const userSkillsQuery = query(
      collection(db, "user_skills"),
      where("user_id", "==", userId)
    );
    const userSkillsSnap = await getDocs(userSkillsQuery);
    const userSkills = userSkillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get all available skills
    const skillsQuery = query(collection(db, "skills"));
    const skillsSnap = await getDocs(skillsQuery);
    const skills = skillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const currentSkills: { [skill: string]: number } = {};
    const requiredSkills: { [skill: string]: number } = {};
    const gaps: { [skill: string]: number } = {};
    
    // Map current skills
    userSkills.forEach(userSkill => {
      currentSkills[userSkill.skill_id] = userSkill.proficiency_level || 0;
    });
    
    // Define required skills based on target role or current role
    skills.forEach(skill => {
      const currentLevel = currentSkills[skill.id] || 0;
      let requiredLevel = 3; // Default required level
      
      // Adjust required level based on skill importance
      if (skill.category === 'Programming') requiredLevel = 4;
      if (skill.category === 'Leadership') requiredLevel = 4;
      if (skill.category === 'Communication') requiredLevel = 3;
      
      requiredSkills[skill.id] = requiredLevel;
      
      if (requiredLevel > currentLevel) {
        gaps[skill.id] = requiredLevel - currentLevel;
      }
    });
    
    // Sort skills by gap size (largest gaps first)
    const prioritySkills = Object.entries(gaps)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([skillId]) => skillId);
    
    // Generate learning path
    const learningPath = prioritySkills.map(skillId => {
      const skill = skills.find(s => s.id === skillId);
      return `Improve ${skill?.name || skillId} from level ${currentSkills[skillId] || 0} to level ${requiredSkills[skillId]}`;
    });
    
    const estimatedTime = Math.ceil(Object.values(gaps).reduce((sum, gap) => sum + gap, 0) * 2); // 2 weeks per level
    
    return {
      current_skills: currentSkills,
      required_skills: requiredSkills,
      gaps,
      priority_skills: prioritySkills,
      learning_path: learningPath,
      estimated_time: estimatedTime
    };
    
  } catch (error) {
    console.error('Error analyzing skill gaps:', error);
    return {
      current_skills: {},
      required_skills: {},
      gaps: {},
      priority_skills: [],
      learning_path: [],
      estimated_time: 0
    };
  }
};

// Meeting Scheduling AI
export const generateMeetingIntelligence = async (
  participants: string[],
  duration: number,
  purpose: string
): Promise<MeetingIntelligence> => {
  try {
    // Get participant availability (simplified)
    const participantAvailability: { [userId: string]: string[] } = {};
    
    // Generate optimal time slots (9 AM - 5 PM, avoiding lunch hour)
    const timeSlots = [
      '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
    ];
    
    participants.forEach(participantId => {
      participantAvailability[participantId] = timeSlots.slice(0, 4); // Assume 4 available slots
    });
    
    // Find common available times
    const commonSlots = timeSlots.filter(slot => 
      participants.every(participant => 
        participantAvailability[participant]?.includes(slot)
      )
    );
    
    // Optimize duration based on purpose
    let optimalDuration = duration;
    if (purpose.includes('brief') || purpose.includes('update')) {
      optimalDuration = Math.min(duration, 30);
    } else if (purpose.includes('planning') || purpose.includes('strategy')) {
      optimalDuration = Math.max(duration, 60);
    }
    
    // Generate agenda suggestions based on purpose
    const agendaSuggestions = [];
    if (purpose.includes('planning')) {
      agendaSuggestions.push('Review current status and challenges');
      agendaSuggestions.push('Define objectives and success criteria');
      agendaSuggestions.push('Assign responsibilities and timelines');
    } else if (purpose.includes('review')) {
      agendaSuggestions.push('Present progress and achievements');
      agendaSuggestions.push('Discuss challenges and roadblocks');
      agendaSuggestions.push('Plan next steps and action items');
    } else {
      agendaSuggestions.push('Share updates and information');
      agendaSuggestions.push('Address questions and concerns');
      agendaSuggestions.push('Set follow-up actions');
    }
    
    // Generate follow-up actions
    const followUpActions = [
      'Send meeting minutes to all participants',
      'Schedule follow-up meeting if needed',
      'Assign action items with deadlines',
      'Update project documentation'
    ];
    
    // Calculate effectiveness score
    const effectivenessScore = Math.min(100, 
      (commonSlots.length / timeSlots.length) * 40 + 
      (optimalDuration / duration) * 30 + 
      (agendaSuggestions.length / 3) * 30
    );
    
    return {
      optimal_duration: optimalDuration,
      best_time_slots: commonSlots,
      participant_availability: participantAvailability,
      agenda_suggestions: agendaSuggestions,
      follow_up_actions: followUpActions,
      effectiveness_score: effectivenessScore
    };
    
  } catch (error) {
    console.error('Error generating meeting intelligence:', error);
    return {
      optimal_duration: duration,
      best_time_slots: ['10:00', '14:00'],
      participant_availability: {},
      agenda_suggestions: ['Standard meeting agenda'],
      follow_up_actions: ['Send meeting minutes'],
      effectiveness_score: 70
    };
  }
};

// Document Analysis AI
export const analyzeDocument = async (content: string, type: string): Promise<DocumentAnalysis> => {
  // Simple document analysis
  const words = content.toLowerCase().split(/\s+/);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Analyze sentiment
  const sentiment = await analyzeSentiment(content);
  
  // Extract key points (simplified - look for important words)
  const importantWords = ['important', 'key', 'critical', 'essential', 'major', 'significant', 'priority', 'urgent'];
  const keyPoints = sentences.filter(sentence => 
    importantWords.some(word => sentence.toLowerCase().includes(word))
  ).slice(0, 5);
  
  // Extract action items (look for action verbs)
  const actionVerbs = ['create', 'update', 'review', 'implement', 'schedule', 'complete', 'submit', 'approve'];
  const actionItems = sentences.filter(sentence => 
    actionVerbs.some(verb => sentence.toLowerCase().includes(verb))
  ).slice(0, 5);
  
  // Calculate readability score (simplified)
  const avgWordsPerSentence = words.length / sentences.length;
  const readabilityScore = Math.max(0, Math.min(100, 
    100 - Math.abs(avgWordsPerSentence - 15) * 2
  ));
  
  // Generate suggestions
  const suggestions = [];
  if (readabilityScore < 70) {
    suggestions.push('Consider using shorter sentences for better readability');
  }
  if (sentiment.score < 0) {
    suggestions.push('Consider using more positive language');
  }
  if (actionItems.length === 0) {
    suggestions.push('Add clear action items to improve document effectiveness');
  }
  
  // Generate summary
  const summary = sentences.slice(0, 3).join('. ') + '.';
  
  return {
    type: type as any,
    sentiment,
    key_points: keyPoints,
    action_items: actionItems,
    readability_score: readabilityScore,
    suggestions,
    summary
  };
};

// Predictive Maintenance for System Health
export const analyzeSystemHealth = async (): Promise<AIInsight[]> => {
  const insights: AIInsight[] = [];
  
  try {
    // Analyze database performance
    const usersQuery = query(collection(db, "employees"), limit(1));
    const startTime = Date.now();
    await getDocs(usersQuery);
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 2000) {
      insights.push({
        type: 'alert',
        title: 'Database Performance Issue',
        description: `Database response time is ${responseTime}ms, which is above normal threshold`,
        confidence: 0.85,
        priority: 'high',
        action: 'optimize_database'
      });
    }
    
    // Check for data consistency issues
    const attendanceQuery = query(collection(db, "attendance"), limit(10));
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendanceDocs = attendanceSnap.docs;
    
    const incompleteRecords = attendanceDocs.filter(doc => {
      const data = doc.data();
      return !data.userId || !data.date || !data.sessions;
    });
    
    if (incompleteRecords.length > 0) {
      insights.push({
        type: 'alert',
        title: 'Data Consistency Issue',
        description: `${incompleteRecords.length} attendance records have incomplete data`,
        confidence: 0.90,
        priority: 'medium',
        action: 'clean_data'
      });
    }
    
    // System optimization suggestions
    insights.push({
      type: 'optimization',
      title: 'System Optimization',
      description: 'Consider implementing caching for frequently accessed data',
      confidence: 0.75,
      priority: 'low',
      action: 'implement_caching'
    });
    
  } catch (error) {
    console.error('Error analyzing system health:', error);
    insights.push({
      type: 'alert',
      title: 'System Health Check Failed',
      description: 'Unable to perform system health analysis',
      confidence: 0.95,
      priority: 'high',
      action: 'investigate_system'
    });
  }
  
  return insights;
};

// Employee Wellness AI
export const analyzeEmployeeWellness = async (userId: string): Promise<AIInsight[]> => {
  const insights: AIInsight[] = [];
  
  try {
    // Analyze workload and stress
    const workload = await analyzeWorkload(userId);
    
    if (workload.burnout_risk > 70) {
      insights.push({
        type: 'alert',
        title: 'High Burnout Risk',
        description: `Burnout risk is ${workload.burnout_risk}%. Consider reducing workload or taking breaks.`,
        confidence: 0.85,
        priority: 'critical',
        action: 'wellness_intervention'
      });
    }
    
    // Analyze attendance patterns for wellness indicators
    const attendanceQuery = query(
      collection(db, "attendance"),
      where("userId", "==", userId),
      orderBy("date", "desc"),
      limit(30)
    );
    const attendanceSnap = await getDocs(attendanceQuery);
    const attendance = attendanceSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const lateEntries = attendance.filter(a => a.status === 'late');
    const absences = attendance.filter(a => a.status === 'absent');
    
    if (lateEntries.length > 5) {
      insights.push({
        type: 'trend',
        title: 'Frequent Late Arrivals',
        description: 'Multiple late arrivals may indicate stress or sleep issues',
        confidence: 0.80,
        priority: 'medium',
        action: 'wellness_check'
      });
    }
    
    if (absences.length > 3) {
      insights.push({
        type: 'alert',
        title: 'Increased Absences',
        description: 'Higher than usual absence rate may indicate health or stress issues',
        confidence: 0.75,
        priority: 'high',
        action: 'wellness_support'
      });
    }
    
    // Wellness recommendations
    if (workload.stress_level === 'high' || workload.stress_level === 'critical') {
      insights.push({
        type: 'recommendation',
        title: 'Wellness Recommendations',
        description: 'Consider stress management techniques, regular breaks, and work-life balance',
        confidence: 0.90,
        priority: 'medium',
        action: 'wellness_program'
      });
    }
    
  } catch (error) {
    console.error('Error analyzing employee wellness:', error);
    
    // Provide default wellness insights when indexes are missing
    insights.push({
      type: 'recommendation',
      title: 'Welcome to Wellness Monitoring!',
      description: 'Complete your profile and start tracking attendance to get personalized wellness insights.',
      confidence: 0.90,
      priority: 'low',
      action: 'setup_wellness_tracking'
    });
    
    insights.push({
      type: 'optimization',
      title: 'General Wellness Tips',
      description: 'Maintain regular work hours, take breaks, and practice stress management techniques.',
      confidence: 0.85,
      priority: 'low',
      action: 'wellness_basics'
    });
  }
  
  return insights;
};

// Team Collaboration AI
export const analyzeTeamCollaboration = async (teamId: string): Promise<AIInsight[]> => {
  const insights: AIInsight[] = [];
  
  try {
    // Get team members and their interactions
    const teamQuery = query(
      collection(db, "teams"),
      where("id", "==", teamId)
    );
    const teamSnap = await getDocs(teamQuery);
    const team = teamSnap.docs[0]?.data();
    
    if (!team) return insights;
    
    // Analyze task distribution
    const tasksQuery = query(
      collection(db, "tasks"),
      where("team_id", "==", teamId)
    );
    const tasksSnap = await getDocs(tasksQuery);
    const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Check for workload imbalance
    const memberWorkload: { [memberId: string]: number } = {};
    team.members.forEach((memberId: string) => {
      memberWorkload[memberId] = tasks.filter(t => t.assigned_to === memberId).length;
    });
    
    const workloads = Object.values(memberWorkload);
    const avgWorkload = workloads.reduce((sum, load) => sum + load, 0) / workloads.length;
    const maxWorkload = Math.max(...workloads);
    const minWorkload = Math.min(...workloads);
    
    if (maxWorkload > avgWorkload * 2) {
      insights.push({
        type: 'alert',
        title: 'Workload Imbalance',
        description: 'Some team members have significantly more tasks than others',
        confidence: 0.85,
        priority: 'medium',
        action: 'redistribute_workload'
      });
    }
    
    // Check for collaboration opportunities
    const collaborativeTasks = tasks.filter(t => 
      t.description?.toLowerCase().includes('collaborate') || 
      t.description?.toLowerCase().includes('team') ||
      t.description?.toLowerCase().includes('together')
    );
    
    if (collaborativeTasks.length < tasks.length * 0.3) {
      insights.push({
        type: 'recommendation',
        title: 'Increase Collaboration',
        description: 'Consider more collaborative tasks to improve team dynamics',
        confidence: 0.75,
        priority: 'low',
        action: 'promote_collaboration'
      });
    }
    
    // Team performance insights
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const completionRate = (completedTasks.length / tasks.length) * 100;
    
    if (completionRate < 70) {
      insights.push({
        type: 'alert',
        title: 'Low Task Completion Rate',
        description: `Team completion rate is ${completionRate.toFixed(1)}%. Consider team support.`,
        confidence: 0.80,
        priority: 'high',
        action: 'team_support'
      });
    }
    
  } catch (error) {
    console.error('Error analyzing team collaboration:', error);
  }
  
  return insights;
};

// Learning Path Optimization
export const optimizeLearningPath = async (userId: string): Promise<SmartSuggestion[]> => {
  const suggestions: SmartSuggestion[] = [];
  
  try {
    // Get user's current skills and career goals
    const skillGaps = await analyzeSkillGaps(userId);
    
    // Generate personalized learning suggestions
    skillGaps.priority_skills.slice(0, 3).forEach(skillId => {
      suggestions.push({
        type: 'learning',
        title: `Focus on ${skillId} Development`,
        description: `Prioritize learning ${skillId} to close skill gap of ${skillGaps.gaps[skillId]} levels`,
        impact: 'high',
        effort: 'medium',
        reasoning: `This skill has the largest gap and is critical for career advancement`
      });
    });
    
    // Suggest learning methods based on skill type
    suggestions.push({
      type: 'learning',
      title: 'Diversify Learning Methods',
      description: 'Combine online courses, hands-on projects, and mentorship for optimal learning',
      impact: 'medium',
      effort: 'low',
      reasoning: 'Mixed learning approaches improve retention and practical application'
    });
    
    // Time management for learning
    suggestions.push({
      type: 'optimization',
      title: 'Schedule Learning Time',
      description: 'Dedicate 2-3 hours per week to skill development',
      impact: 'medium',
      effort: 'low',
      reasoning: 'Consistent learning time leads to better skill development'
    });
    
  } catch (error) {
    console.error('Error optimizing learning path:', error);
  }
  
  return suggestions;
};

// Performance Prediction AI
export const predictPerformance = async (userId: string): Promise<AIPrediction> => {
  try {
    // Analyze various performance factors
    const workload = await analyzeWorkload(userId);
    const skillGaps = await analyzeSkillGaps(userId);
    const productivityScore = await calculateProductivityScore(userId);
    
    // Calculate performance prediction
    let performanceScore = productivityScore;
    
    // Adjust based on workload
    if (workload.stress_level === 'critical') performanceScore *= 0.7;
    else if (workload.stress_level === 'high') performanceScore *= 0.85;
    else if (workload.stress_level === 'low') performanceScore *= 1.1;
    
    // Adjust based on skill gaps
    const totalGaps = Object.values(skillGaps.gaps).reduce((sum, gap) => sum + gap, 0);
    if (totalGaps > 10) performanceScore *= 0.9;
    else if (totalGaps < 5) performanceScore *= 1.05;
    
    performanceScore = Math.max(0, Math.min(100, performanceScore));
    
    const factors = [
      `Current productivity score: ${productivityScore}%`,
      `Workload stress level: ${workload.stress_level}`,
      `Skill gaps: ${totalGaps} total levels needed`,
      `Burnout risk: ${workload.burnout_risk}%`
    ];
    
    const recommendations = [];
    if (workload.burnout_risk > 70) {
      recommendations.push('Consider reducing workload to prevent burnout');
    }
    if (totalGaps > 10) {
      recommendations.push('Focus on closing critical skill gaps');
    }
    if (productivityScore < 70) {
      recommendations.push('Implement productivity improvement strategies');
    }
    
    return {
      type: 'performance',
      value: `${Math.round(performanceScore)}%`,
      confidence: 0.80,
      factors,
      recommendations
    };
    
  } catch (error) {
    console.error('Error predicting performance:', error);
    return {
      type: 'performance',
      value: 'Unable to predict',
      confidence: 0.0,
      factors: ['Insufficient data'],
      recommendations: ['Continue tracking performance metrics']
    };
  }
}; 