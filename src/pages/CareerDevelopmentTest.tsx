import React, { useState } from "react";
import { TrendingUp, BookOpen, Award, Target, Lightbulb, Clock } from "lucide-react";
import { useAuthStore } from "../store/authStore";

export default function CareerDevelopmentTest() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");

  // Test data
  const testSkills = [
    { id: "js", name: "JavaScript", category: "Programming", difficulty_level: "intermediate" },
    { id: "react", name: "React", category: "Frontend", difficulty_level: "intermediate" },
    { id: "node", name: "Node.js", category: "Backend", difficulty_level: "intermediate" },
    { id: "python", name: "Python", category: "Programming", difficulty_level: "beginner" },
    { id: "sql", name: "SQL", category: "Database", difficulty_level: "beginner" },
    { id: "pm", name: "Project Management", category: "Management", difficulty_level: "intermediate" },
    { id: "leadership", name: "Leadership", category: "Soft Skills", difficulty_level: "advanced" },
    { id: "communication", name: "Communication", category: "Soft Skills", difficulty_level: "beginner" }
  ];

  const testCourses = [
    { id: "js-fundamentals", title: "JavaScript Fundamentals", description: "Learn the basics of JavaScript programming", category: "Programming", difficulty_level: "beginner", duration_hours: 20 },
    { id: "react-beginners", title: "React for Beginners", description: "Build your first React application", category: "Frontend", difficulty_level: "beginner", duration_hours: 30 },
    { id: "node-backend", title: "Node.js Backend Development", description: "Build scalable backend applications with Node.js", category: "Backend", difficulty_level: "intermediate", duration_hours: 35 },
    { id: "leadership-essentials", title: "Leadership Essentials", description: "Develop essential leadership skills", category: "Management", difficulty_level: "intermediate", duration_hours: 25 }
  ];

  const testCertifications = [
    { id: "aws-dev", name: "AWS Certified Developer", provider: "Amazon Web Services", description: "Cloud development certification", category: "Cloud", difficulty_level: "intermediate", duration_months: 3, cost: 150.00 },
    { id: "pmp", name: "PMP Certification", provider: "PMI", description: "Project Management Professional certification", category: "Management", difficulty_level: "advanced", duration_months: 6, cost: 555.00 }
  ];

  const testRecommendations = [
    {
      id: "1",
      title: "Start Your Skill Assessment",
      description: "Assess your current skills to get personalized recommendations",
      priority: "critical",
      reasoning: "You haven't assessed your skills yet. Start with a skill assessment to get personalized recommendations."
    },
    {
      id: "2",
      title: "Improve JavaScript Skills",
      description: "Take courses to improve your JavaScript proficiency",
      priority: "high",
      reasoning: "JavaScript is a fundamental skill for web development."
    },
    {
      id: "3",
      title: "Get Leadership Certification",
      description: "Validate your leadership expertise with industry-recognized certification",
      priority: "medium",
      reasoning: "Leadership skills are valuable for career advancement."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Career Development Test</h1>
          <p className="text-gray-600 dark:text-gray-400">Testing career development features</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "skills", label: "Skills Assessment", icon: Target },
              { id: "courses", label: "Learning Courses", icon: BookOpen },
              { id: "certifications", label: "Certifications", icon: Award },
              { id: "recommendations", label: "AI Recommendations", icon: Lightbulb }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                  activeTab === id
                    ? "bg-blue-500 text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-3xl font-bold text-blue-600 mb-2">8</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Available Skills</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-3xl font-bold text-green-600 mb-2">4</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Learning Courses</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-3xl font-bold text-orange-600 mb-2">2</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Certifications</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="text-3xl font-bold text-purple-600 mb-2">3</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Recommendations</div>
              </div>
            </div>

            {/* Career Goal Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Career Goal</h3>
                <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Target: Senior Developer
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Department: Engineering
                  </p>
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Readiness</span>
                      <span>65%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: "65%" }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Skills to Develop (3)
                  </h5>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">JavaScript</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">React</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Leadership</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills Assessment Tab */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Assessment</h2>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                Assess Skills
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testSkills.map((skill) => (
                <div key={skill.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{skill.name}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                      Not Assessed
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{skill.category}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{skill.category}</span>
                    <span className="capitalize">{skill.difficulty_level}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Learning Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testCourses.map((course) => (
                <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {course.difficulty_level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{course.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration_hours}h
                    </span>
                    <span>{course.category}</span>
                  </div>
                  <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    Start Course
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === "certifications" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Certifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {testCertifications.map((cert) => (
                <div key={cert.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{cert.name}</h3>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                      {cert.difficulty_level}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{cert.description}</p>
                  <div className="space-y-2 text-xs text-gray-500 mb-3">
                    <div className="flex justify-between">
                      <span>Provider</span>
                      <span>{cert.provider}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration</span>
                      <span>{cert.duration_months} months</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cost</span>
                      <span>${cert.cost}</span>
                    </div>
                  </div>
                  <button className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    Learn More
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Recommendations Tab */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI-Powered Recommendations</h2>
            <div className="space-y-4">
              {testRecommendations.map((rec) => (
                <div key={rec.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-200">
                        <Lightbulb className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h3>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{rec.description}</p>
                        <p className="text-sm text-gray-500 mb-3">
                          <strong>Reasoning:</strong> {rec.reasoning}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                        Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 