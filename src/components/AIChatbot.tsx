import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Brain, TrendingUp, Target, Heart, Activity } from 'lucide-react';
import { 
  generateAIResponse,
  analyzeSentiment,
  analyzeWorkload,
  predictPerformance,
  optimizeLearningPath,
  generateMeetingIntelligence
} from '../utils/aiUtils';
import { useAuthStore } from '../store/authStore';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'insight' | 'suggestion' | 'analysis';
  data?: any;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI assistant. I can help you with tasks, projects, attendance, performance analysis, and much more. What would you like to know?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !user?.uid) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // Analyze user input for intent
      const lowerText = inputText.toLowerCase();
      let aiResponse: Message;

      if (lowerText.includes('workload') || lowerText.includes('stress') || lowerText.includes('busy')) {
        const workload = await analyzeWorkload(user.uid);
        aiResponse = {
          id: (Date.now() + 1).toString(),
          text: `Your current workload is ${workload.current_load}% with a ${workload.stress_level} stress level. Burnout risk: ${workload.burnout_risk}%. ${workload.recommendations[0] || 'Consider taking breaks and prioritizing tasks.'}`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'analysis',
          data: workload
        };
      } else if (lowerText.includes('performance') || lowerText.includes('productivity')) {
        const performance = await predictPerformance(user.uid);
        aiResponse = {
          id: (Date.now() + 1).toString(),
          text: `Your predicted performance is ${performance.value} with ${Math.round(performance.confidence * 100)}% confidence. ${performance.recommendations[0] || 'Keep up the good work!'}`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'analysis',
          data: performance
        };
      } else if (lowerText.includes('learning') || lowerText.includes('skill') || lowerText.includes('improve')) {
        const learning = await optimizeLearningPath(user.uid);
        aiResponse = {
          id: (Date.now() + 1).toString(),
          text: `Here are your top learning priorities: ${learning.slice(0, 2).map(l => l.title).join(', ')}. Focus on high-impact skills for career growth.`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'suggestion',
          data: learning
        };
      } else if (lowerText.includes('meeting') || lowerText.includes('schedule')) {
        const meeting = await generateMeetingIntelligence([user.uid], 60, 'team update');
        aiResponse = {
          id: (Date.now() + 1).toString(),
          text: `For optimal meeting scheduling, consider ${meeting.best_time_slots.slice(0, 2).join(' or ')}. Optimal duration: ${meeting.optimal_duration} minutes. Effectiveness score: ${meeting.effectiveness_score}%.`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'suggestion',
          data: meeting
        };
      } else if (lowerText.includes('sentiment') || lowerText.includes('mood') || lowerText.includes('feel')) {
        const sentiment = await analyzeSentiment(inputText);
        aiResponse = {
          id: (Date.now() + 1).toString(),
          text: `I detect a ${sentiment.overall} sentiment in your message. ${sentiment.suggestions[0] || 'Your communication is clear and effective.'}`,
          sender: 'ai',
          timestamp: new Date(),
          type: 'analysis',
          data: sentiment
        };
      } else {
        // General response
        const response = generateAIResponse(inputText, { userId: user.uid });
        aiResponse = {
          id: (Date.now() + 1).toString(),
          text: response,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };
      }

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getMessageIcon = (type?: string) => {
    switch (type) {
      case 'analysis': return <Activity className="h-4 w-4 text-blue-600" />;
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-yellow-600" />;
      case 'insight': return <TrendingUp className="h-4 w-4 text-green-600" />;
      default: return null;
    }
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        {isOpen ? (
          <Bot className="h-6 w-6" />
        ) : (
          <Brain className="h-6 w-6" />
        )}
      </button>

      {/* Chatbot Interface */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant</h3>
            </div>
            <p className="text-xs text-blue-100 mt-1">
              Ask me about tasks, performance, workload, or anything else!
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.sender === 'ai' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${message.sender === 'user' ? 'order-1' : 'order-2'}`}>
                  <div className={`p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}>
                    <div className="flex items-start gap-2">
                      {getMessageIcon(message.type)}
                      <div className="flex-1">
                        <p className="text-sm">{message.text}</p>
                        {message.data && message.type === 'analysis' && (
                          <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                            <div className="font-medium mb-1">Analysis Details:</div>
                            {message.data.current_load && (
                              <div>Workload: {message.data.current_load}%</div>
                            )}
                            {message.data.value && (
                              <div>Performance: {message.data.value}</div>
                            )}
                            {message.data.overall && (
                              <div>Sentiment: {message.data.overall}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className={`text-xs text-gray-500 mt-1 ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.sender === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center order-2">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                disabled={isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 