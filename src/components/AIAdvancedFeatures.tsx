import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Zap, 
  Heart, 
  Users, 
  BookOpen, 
  FileText, 
  Clock,
  Smile,
  Frown,
  Meh,
  Activity,
  BarChart3,
  Lightbulb,
  Shield,
  Settings
} from 'lucide-react';
import { 
  analyzeSentiment,
  analyzeWorkload,
  analyzeSkillGaps,
  generateMeetingIntelligence,
  analyzeDocument,
  analyzeEmployeeWellness,
  analyzeTeamCollaboration,
  optimizeLearningPath,
  predictPerformance,
  SentimentAnalysis,
  WorkloadAnalysis,
  SkillGapAnalysis,
  MeetingIntelligence,
  DocumentAnalysis,
  AIInsight,
  SmartSuggestion,
  AIPrediction
} from '../utils/aiUtils';
import { useAuthStore } from '../store/authStore';

// Sentiment Analysis Widget
export const SentimentAnalysisWidget = ({ text, onAnalysisComplete }: { 
  text: string; 
  onAnalysisComplete?: (analysis: SentimentAnalysis) => void;
}) => {
  const [analysis, setAnalysis] = useState<SentimentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (text.trim()) {
      setLoading(true);
      analyzeSentiment(text).then(result => {
        setAnalysis(result);
        onAnalysisComplete?.(result);
        setLoading(false);
      });
    }
  }, [text]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Sentiment Analysis</h3>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const getSentimentIcon = () => {
    switch (analysis.overall) {
      case 'positive': return <Smile className="h-6 w-6 text-green-600" />;
      case 'negative': return <Frown className="h-6 w-6 text-red-600" />;
      default: return <Meh className="h-6 w-6 text-yellow-600" />;
    }
  };

  const getSentimentColor = () => {
    switch (analysis.overall) {
      case 'positive': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'negative': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-900 dark:text-blue-100">Sentiment Analysis</h3>
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        {getSentimentIcon()}
        <div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor()}`}>
            {analysis.overall.charAt(0).toUpperCase() + analysis.overall.slice(1)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Score: {(analysis.score * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium text-sm text-gray-900 dark:text-white">Emotions Detected:</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(analysis.emotions).map(([emotion, score]) => (
            <div key={emotion} className="flex justify-between items-center">
              <span className="capitalize">{emotion}:</span>
              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${score * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {analysis.keywords.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Key Words:</h4>
          <div className="flex flex-wrap gap-1">
            {analysis.keywords.slice(0, 5).map((keyword, index) => (
              <span key={index} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.suggestions.length > 0 && (
        <div className="mt-3">
          <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Suggestions:</h4>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {analysis.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-blue-500 mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// Workload Analysis Widget
export const WorkloadAnalysisWidget = ({ userId }: { userId: string }) => {
  const [workload, setWorkload] = useState<WorkloadAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeWorkload(userId).then(result => {
      setWorkload(result);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold">Workload Analysis</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!workload) return null;

  const getStressColor = () => {
    switch (workload.stress_level) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold">Workload Analysis</h3>
        </div>
      </div>
      <div className="card-body">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{workload.current_load}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Current Load</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{workload.capacity}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Available Capacity</div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Workload</span>
              <span>{workload.current_load}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${workload.current_load}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Burnout Risk</span>
              <span>{workload.burnout_risk}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  workload.burnout_risk > 70 ? 'bg-red-500' :
                  workload.burnout_risk > 40 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${workload.burnout_risk}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStressColor()}`}>
            Stress Level: {workload.stress_level}
          </span>
        </div>

        {workload.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Recommendations:</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {workload.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-blue-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Skill Gap Analysis Widget
export const SkillGapAnalysisWidget = ({ userId }: { userId: string }) => {
  const [skillGaps, setSkillGaps] = useState<SkillGapAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeSkillGaps(userId).then(result => {
      setSkillGaps(result);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold">Skill Gap Analysis</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!skillGaps) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold">Skill Gap Analysis</h3>
        </div>
      </div>
      <div className="card-body">
        <div className="mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Object.keys(skillGaps.gaps).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Skills Need Improvement</div>
          </div>
        </div>

        {skillGaps.priority_skills.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white">Priority Skills:</h4>
            {skillGaps.priority_skills.slice(0, 5).map((skillId, index) => {
              const gap = skillGaps.gaps[skillId];
              const current = skillGaps.current_skills[skillId] || 0;
              const required = skillGaps.required_skills[skillId] || 0;
              
              return (
                <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">{skillId}</span>
                    <span className="text-xs text-red-600 font-medium">Gap: {gap} levels</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Current: Level {current}</span>
                    <span>Required: Level {required}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                      style={{ width: `${(current / required) * 100}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {skillGaps.learning_path.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Learning Path:</h4>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {skillGaps.learning_path.slice(0, 3).map((path, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-purple-500 mt-0.5">•</span>
                  {path}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{skillGaps.estimated_time}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Weeks to Close Gaps</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Employee Wellness Widget
export const EmployeeWellnessWidget = ({ userId }: { userId: string }) => {
  const [wellnessInsights, setWellnessInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeEmployeeWellness(userId).then(insights => {
      setWellnessInsights(insights);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-600" />
            <h3 className="font-semibold">Employee Wellness</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (wellnessInsights.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Employee Wellness</h3>
          </div>
        </div>
        <div className="card-body text-center">
          <div className="text-4xl mb-2">😊</div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Great! Your wellness indicators are positive.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600" />
          <h3 className="font-semibold">Employee Wellness</h3>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          {wellnessInsights.slice(0, 3).map((insight, index) => (
            <div key={index} className={`p-3 rounded-lg border-l-4 ${
              insight.priority === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
              insight.priority === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
              insight.priority === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
              'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            }`}>
              <div className="flex items-start gap-2">
                {insight.type === 'alert' && <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />}
                {insight.type === 'recommendation' && <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />}
                {insight.type === 'trend' && <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />}
                <div className="flex-1">
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Team Collaboration Widget
export const TeamCollaborationWidget = ({ teamId }: { teamId: string }) => {
  const [collaborationInsights, setCollaborationInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeTeamCollaboration(teamId).then(insights => {
      setCollaborationInsights(insights);
      setLoading(false);
    });
  }, [teamId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold">Team Collaboration</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold">Team Collaboration</h3>
        </div>
      </div>
      <div className="card-body">
        {collaborationInsights.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-2">🤝</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Team collaboration is going well!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {collaborationInsights.slice(0, 3).map((insight, index) => (
              <div key={index} className={`p-3 rounded-lg border-l-4 ${
                insight.priority === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                insight.priority === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
                insight.priority === 'medium' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <div className="flex items-start gap-2">
                  {insight.type === 'alert' && <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />}
                  {insight.type === 'recommendation' && <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />}
                  {insight.type === 'trend' && <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Performance Prediction Widget
export const PerformancePredictionWidget = ({ userId }: { userId: string }) => {
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    predictPerformance(userId).then(result => {
      setPrediction(result);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            <h3 className="font-semibold">Performance Prediction</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!prediction) return null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          <h3 className="font-semibold">Performance Prediction</h3>
        </div>
      </div>
      <div className="card-body">
        <div className="text-center mb-4">
          <div className="text-3xl font-bold text-teal-600 mb-1">
            {prediction.value}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Predicted Performance
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Confidence: {Math.round(prediction.confidence * 100)}%
          </div>
        </div>

        {prediction.factors.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Factors:</h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {prediction.factors.slice(0, 3).map((factor, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-teal-500 mt-0.5">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {prediction.recommendations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">Recommendations:</h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {prediction.recommendations.slice(0, 2).map((rec, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span className="text-teal-500 mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// Learning Path Widget
export const LearningPathWidget = ({ userId }: { userId: string }) => {
  const [learningSuggestions, setLearningSuggestions] = useState<SmartSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    optimizeLearningPath(userId).then(suggestions => {
      setLearningSuggestions(suggestions);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-emerald-600" />
            <h3 className="font-semibold">Learning Path</h3>
          </div>
        </div>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-600" />
          <h3 className="font-semibold">Learning Path</h3>
        </div>
      </div>
      <div className="card-body">
        {learningSuggestions.length === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-2">📚</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your learning path is optimized!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {learningSuggestions.slice(0, 3).map((suggestion, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className={`p-1 rounded-full ${
                    suggestion.impact === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200' :
                    suggestion.impact === 'medium' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-200'
                  }`}>
                    📚
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{suggestion.title}</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{suggestion.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">Impact: {suggestion.impact}</span>
                      <span className="text-xs text-gray-500">Effort: {suggestion.effort}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 