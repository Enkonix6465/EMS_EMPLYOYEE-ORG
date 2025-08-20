import React, { useState, useEffect } from "react";
import { 
  TrendingUp, 
  BookOpen, 
  Award, 
  Target, 
  Lightbulb, 
  CheckCircle, 
  Clock, 
  Star,
  BarChart3,
  Users,
  Zap,
  ArrowRight,
  Plus,
  Edit,
  Trash2,
  Eye,
  X
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { db } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  limit
} from "firebase/firestore";
import toast from "react-hot-toast";
import { calculateSkillGaps } from "../utils/careerUtils";

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  difficulty_level: string;
  department: string;
}

interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  proficiency_level: number;
  self_assessment_date: string;
  manager_assessment?: number;
  manager_assessment_date?: string;
  notes?: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty_level: string;
  duration_hours: number;
  skills_covered: string[];
  course_url?: string;
}

interface Certification {
  id: string;
  name: string;
  provider: string;
  description: string;
  category: string;
  difficulty_level: string;
  duration_months: number;
  cost: number;
  skills_covered: string[];
  certification_url?: string;
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  department: string;
  levels: any[];
  required_skills: string[];
  recommended_courses: string[];
  recommended_certifications: string[];
}

interface UserCareerGoal {
  id: string;
  user_id: string;
  target_role: string;
  target_department: string;
  target_level: string;
  current_readiness_percentage: number;
  skills_to_develop: string[];
  courses_to_complete: string[];
  certifications_to_obtain: string[];
  timeline_months: number;
  notes?: string;
}

interface LearningRecommendation {
  id: string;
  user_id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  reasoning: string;
  related_items: any;
  is_completed: boolean;
  completed_at?: string;
}

export default function CareerDevelopment() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [careerPaths, setCareerPaths] = useState<CareerPath[]>([]);
  const [userCareerGoal, setUserCareerGoal] = useState<UserCareerGoal | null>(null);
  const [recommendations, setRecommendations] = useState<LearningRecommendation[]>([]);
  const [showSkillAssessment, setShowSkillAssessment] = useState(false);
  const [showCareerGoalModal, setShowCareerGoalModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [skillAssessment, setSkillAssessment] = useState<{[key: string]: number}>({});
  const [skillGaps, setSkillGaps] = useState<any[]>([]);

  // Default data to ensure the page shows content
  const defaultSkills: Skill[] = [
    { id: "js", name: "JavaScript", category: "Programming", description: "Modern JavaScript development", difficulty_level: "intermediate", department: "Engineering" },
    { id: "react", name: "React", category: "Frontend", description: "React.js library for building user interfaces", difficulty_level: "intermediate", department: "Engineering" },
    { id: "node", name: "Node.js", category: "Backend", description: "Server-side JavaScript runtime", difficulty_level: "intermediate", department: "Engineering" },
    { id: "python", name: "Python", category: "Programming", description: "Python programming language", difficulty_level: "beginner", department: "Engineering" },
    { id: "sql", name: "SQL", category: "Database", description: "Structured Query Language for database management", difficulty_level: "beginner", department: "Engineering" },
    { id: "pm", name: "Project Management", category: "Management", description: "Project planning, execution, and monitoring", difficulty_level: "intermediate", department: "Operations" },
    { id: "leadership", name: "Leadership", category: "Soft Skills", description: "Team leadership and people management", difficulty_level: "advanced", department: "Human Resources" },
    { id: "communication", name: "Communication", category: "Soft Skills", description: "Effective written and verbal communication", difficulty_level: "beginner", department: "Human Resources" }
  ];

  const defaultCourses: Course[] = [
    { id: "js-fundamentals", title: "JavaScript Fundamentals", description: "Learn the basics of JavaScript programming", category: "Programming", difficulty_level: "beginner", duration_hours: 20, skills_covered: ["js"] },
    { id: "react-beginners", title: "React for Beginners", description: "Build your first React application", category: "Frontend", difficulty_level: "beginner", duration_hours: 30, skills_covered: ["react", "js"] },
    { id: "node-backend", title: "Node.js Backend Development", description: "Build scalable backend applications with Node.js", category: "Backend", difficulty_level: "intermediate", duration_hours: 35, skills_covered: ["node", "js"] },
    { id: "leadership-essentials", title: "Leadership Essentials", description: "Develop essential leadership skills", category: "Management", difficulty_level: "intermediate", duration_hours: 25, skills_covered: ["leadership", "communication"] }
  ];

  const defaultCertifications: Certification[] = [
    { id: "aws-dev", name: "AWS Certified Developer", provider: "Amazon Web Services", description: "Cloud development certification", category: "Cloud", difficulty_level: "intermediate", duration_months: 3, cost: 150.00, skills_covered: ["js", "node"] },
    { id: "pmp", name: "PMP Certification", provider: "PMI", description: "Project Management Professional certification", category: "Management", difficulty_level: "advanced", duration_months: 6, cost: 555.00, skills_covered: ["pm"] }
  ];

  const defaultCareerPaths: CareerPath[] = [
    {
      id: "software-engineer",
      title: "Software Engineer Path",
      description: "Progression from Junior to Senior Software Engineer",
      department: "Engineering",
      levels: [
        { level: "Junior Developer", requirements: ["js", "react"], years_experience: 0 },
        { level: "Mid-level Developer", requirements: ["js", "react", "node"], years_experience: 2 },
        { level: "Senior Developer", requirements: ["js", "react", "node", "leadership"], years_experience: 5 }
      ],
      required_skills: ["js", "react", "node", "leadership", "pm"],
      recommended_courses: ["js-fundamentals", "react-beginners", "node-backend"],
      recommended_certifications: ["aws-dev"]
    }
  ];

  const defaultRecommendations: LearningRecommendation[] = [
    {
      id: "1",
      user_id: user?.uid || "",
      recommendation_type: "skill_development",
      title: "Start Your Skill Assessment",
      description: "Assess your current skills to get personalized recommendations",
      priority: "critical",
      reasoning: "You haven't assessed your skills yet. Start with a skill assessment to get personalized recommendations.",
      related_items: { action: "skill_assessment" },
      is_completed: false
    },
    {
      id: "2",
      user_id: user?.uid || "",
      recommendation_type: "course",
      title: "Improve JavaScript Skills",
      description: "Take courses to improve your JavaScript proficiency",
      priority: "high",
      reasoning: "JavaScript is a fundamental skill for web development.",
      related_items: { courses: [defaultCourses[0]] },
      is_completed: false
    }
  ];

  useEffect(() => {
    console.log("CareerDevelopment component mounted");
    if (user?.uid) {
      console.log("User found, fetching career data...");
      fetchCareerData();
    } else {
      console.log("No user found, setting default data...");
      setDefaultData();
    }
  }, [user?.uid]);

  const setDefaultData = () => {
    console.log("Setting default data...");
    setSkills(defaultSkills);
    setCourses(defaultCourses);
    setCertifications(defaultCertifications);
    setCareerPaths(defaultCareerPaths);
    setRecommendations(defaultRecommendations);
    setUserSkills([]);
    setSkillGaps([]);
    setLoading(false);
  };

  const fetchCareerData = async () => {
    try {
      setLoading(true);
      
      // Fetch all career-related data with error handling
      const fetchData = async () => {
        const results = {
          skills: [] as Skill[],
          userSkills: [] as UserSkill[],
          courses: [] as Course[],
          certifications: [] as Certification[],
          careerPaths: [] as CareerPath[],
          userCareerGoal: null as UserCareerGoal | null,
          recommendations: [] as LearningRecommendation[]
        };

        try {
          // Fetch skills
          const skillsSnap = await getDocs(collection(db, "skills"));
          results.skills = skillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Skill));
        } catch (error) {
          console.log("Skills collection not found, using default skills");
          // Provide default skills if collection doesn't exist
          results.skills = defaultSkills;
        }

        try {
          // Fetch user skills
          const userSkillsSnap = await getDocs(query(collection(db, "user_skills"), where("user_id", "==", user!.uid)));
          results.userSkills = userSkillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserSkill));
        } catch (error) {
          console.log("User skills collection not found, starting with empty skills");
          results.userSkills = [];
        }

        try {
          // Fetch courses
          const coursesSnap = await getDocs(collection(db, "courses"));
          results.courses = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
        } catch (error) {
          console.log("Courses collection not found, using default courses");
          results.courses = defaultCourses;
        }

        try {
          // Fetch certifications
          const certificationsSnap = await getDocs(collection(db, "certifications"));
          results.certifications = certificationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Certification));
        } catch (error) {
          console.log("Certifications collection not found, using default certifications");
          results.certifications = defaultCertifications;
        }

        try {
          // Fetch career paths
          const careerPathsSnap = await getDocs(collection(db, "career_paths"));
          results.careerPaths = careerPathsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CareerPath));
        } catch (error) {
          console.log("Career paths collection not found, using default career paths");
          results.careerPaths = defaultCareerPaths;
        }

        try {
          // Fetch user career goal
          const userCareerGoalSnap = await getDocs(query(collection(db, "user_career_goals"), where("user_id", "==", user!.uid), limit(1)));
          if (!userCareerGoalSnap.empty) {
            results.userCareerGoal = { id: userCareerGoalSnap.docs[0].id, ...userCareerGoalSnap.docs[0].data() } as UserCareerGoal;
          }
        } catch (error) {
          console.log("User career goals collection not found");
          results.userCareerGoal = null;
        }

        try {
          // Fetch recommendations
          const recommendationsSnap = await getDocs(query(collection(db, "learning_recommendations"), where("user_id", "==", user!.uid), orderBy("created_at", "desc")));
          results.recommendations = recommendationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LearningRecommendation));
        } catch (error) {
          console.log("Learning recommendations collection not found");
          results.recommendations = [];
        }

        return results;
      };

      const data = await fetchData();
      
      setSkills(data.skills);
      setUserSkills(data.userSkills);
      setCourses(data.courses);
      setCertifications(data.certifications);
      setCareerPaths(data.careerPaths);
      
      if (data.userCareerGoal) {
        setUserCareerGoal(data.userCareerGoal);
      }
      
      setRecommendations(data.recommendations);
      
      // Calculate skill gaps
      const gaps = calculateSkillGaps(data.userSkills, data.skills.map(s => s.id), data.skills);
      setSkillGaps(gaps);

      // Generate recommendations if none exist
      if (data.recommendations.length === 0 && data.skills.length > 0) {
        generateRecommendations();
      }

    } catch (error) {
      console.error("Error fetching career data:", error);
      toast.error("Failed to load career data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      const newRecommendations: Partial<LearningRecommendation>[] = [];

      // If no skills assessed yet, recommend starting with skill assessment
      if (userSkills.length === 0) {
        newRecommendations.push({
          user_id: user!.uid,
          recommendation_type: "skill_development",
          title: "Start Your Skill Assessment",
          description: "Assess your current skills to get personalized recommendations",
          priority: "critical",
          reasoning: "You haven't assessed your skills yet. Start with a skill assessment to get personalized recommendations.",
          related_items: { action: "skill_assessment" }
        });
      } else {
        // Simple AI recommendation logic based on user skills and career goals
        const lowSkillLevels = userSkills.filter(us => us.proficiency_level <= 2);
        
        // Recommend courses for low-skill areas
        lowSkillLevels.forEach(userSkill => {
          const skill = skills.find(s => s.id === userSkill.skill_id);
          const relatedCourses = courses.filter(c => 
            c.skills_covered.includes(userSkill.skill_id)
          );

          if (skill && relatedCourses.length > 0) {
            newRecommendations.push({
              user_id: user!.uid,
              recommendation_type: "course",
              title: `Improve ${skill.name} Skills`,
              description: `Take courses to improve your ${skill.name} proficiency from level ${userSkill.proficiency_level} to level 4+`,
              priority: userSkill.proficiency_level === 1 ? "critical" : "high",
              reasoning: `Your ${skill.name} skill is at level ${userSkill.proficiency_level}, which needs improvement for career growth`,
              related_items: { courses: relatedCourses.slice(0, 3) }
            });
          }
        });

        // Recommend certifications for high-level skills
        const highSkillLevels = userSkills.filter(us => us.proficiency_level >= 4);
        highSkillLevels.forEach(userSkill => {
          const skill = skills.find(s => s.id === userSkill.skill_id);
          const relatedCertifications = certifications.filter(cert => 
            cert.skills_covered.includes(userSkill.skill_id)
          );

          if (skill && relatedCertifications.length > 0) {
            newRecommendations.push({
              user_id: user!.uid,
              recommendation_type: "certification",
              title: `Get ${skill.name} Certification`,
              description: `Validate your ${skill.name} expertise with industry-recognized certification`,
              priority: "high",
              reasoning: `You have strong ${skill.name} skills (level ${userSkill.proficiency_level}). A certification will enhance your credentials.`,
              related_items: { certifications: relatedCertifications.slice(0, 2) }
            });
          }
        });

        // Career path recommendations
        if (skillGaps.length > 0) {
          const mostCriticalGap = skillGaps[0];
          newRecommendations.push({
            user_id: user!.uid,
            recommendation_type: "career_path",
            title: `Focus on ${mostCriticalGap.skillName} Development`,
            description: `Prioritize developing your ${mostCriticalGap.skillName} skills for career advancement`,
            priority: "high",
            reasoning: `This skill has the largest gap (${mostCriticalGap.gap} levels) and is critical for your target role`,
            related_items: { 
              skillGap: mostCriticalGap,
              suggestedTimeline: `${mostCriticalGap.gap * 2} months`
            }
          });
        }
      }

      // Save recommendations to Firestore
      for (const rec of newRecommendations) {
        try {
          await setDoc(doc(collection(db, "learning_recommendations")), rec);
        } catch (error) {
          console.log("Could not save recommendation to Firestore:", error);
        }
      }

      // Update local state with new recommendations
      setRecommendations(prev => [...prev, ...newRecommendations as LearningRecommendation[]]);

    } catch (error) {
      console.error("Error generating recommendations:", error);
    }
  };

  const handleSkillAssessment = async () => {
    try {
      const assessmentData = Object.entries(skillAssessment).map(([skillId, level]) => ({
        user_id: user!.uid,
        skill_id: skillId,
        proficiency_level: level,
        self_assessment_date: new Date().toISOString()
      }));

      // Save skill assessments
      for (const assessment of assessmentData) {
        await setDoc(doc(collection(db, "user_skills")), assessment);
      }

      toast.success("Skill assessment saved successfully!");
      setShowSkillAssessment(false);
      setSkillAssessment({});
      fetchCareerData(); // Refresh data
    } catch (error) {
      console.error("Error saving skill assessment:", error);
      toast.error("Failed to save skill assessment");
    }
  };

  const handleCareerGoalUpdate = async (goalData: Partial<UserCareerGoal>) => {
    try {
      if (userCareerGoal) {
        await updateDoc(doc(db, "user_career_goals", userCareerGoal.id), {
          ...goalData,
          updated_at: new Date().toISOString()
        });
      } else {
        await setDoc(doc(collection(db, "user_career_goals")), {
          ...goalData,
          user_id: user!.uid,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      toast.success("Career goal updated successfully!");
      setShowCareerGoalModal(false);
      fetchCareerData(); // Refresh data
    } catch (error) {
      console.error("Error updating career goal:", error);
      toast.error("Failed to update career goal");
    }
  };

  const getSkillLevel = (skillId: string) => {
    const userSkill = userSkills.find(us => us.skill_id === skillId);
    return userSkill?.proficiency_level || 0;
  };

  const getSkillName = (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    return skill?.name || skillId;
  };

  const getReadinessPercentage = (careerPath: CareerPath) => {
    const requiredSkills = careerPath.required_skills;
    const userSkillLevels = requiredSkills.map(skillId => getSkillLevel(skillId));
    const averageLevel = userSkillLevels.reduce((sum, level) => sum + level, 0) / userSkillLevels.length;
    return Math.min(Math.round((averageLevel / 5) * 100), 100);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200";
      case "high": return "text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-200";
      case "medium": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading career development data...</p>
        </div>
      </div>
    );
  }

  // Ensure we have some data to display
  const displaySkills = skills.length > 0 ? skills : defaultSkills;
  const displayCourses = courses.length > 0 ? courses : defaultCourses;
  const displayCertifications = certifications.length > 0 ? certifications : defaultCertifications;
  const displayCareerPaths = careerPaths.length > 0 ? careerPaths : defaultCareerPaths;
  const displayRecommendations = recommendations.length > 0 ? recommendations : defaultRecommendations;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Test Section - Remove this later */}
        <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <h3 className="font-bold text-yellow-800 dark:text-yellow-200">Debug Info:</h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Skills: {displaySkills.length} | Courses: {displayCourses.length} | 
            Certifications: {displayCertifications.length} | Career Paths: {displayCareerPaths.length} |
            Recommendations: {displayRecommendations.length}
          </p>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">Career Development</h1>
          <p className="text-muted">Personalized career growth and skill development</p>
          
          {/* Debug button for testing */}
          <button
            onClick={() => {
              console.log("Current state:", {
                skills: skills.length,
                userSkills: userSkills.length,
                courses: courses.length,
                certifications: certifications.length,
                careerPaths: careerPaths.length,
                recommendations: recommendations.length
              });
              toast.success("Debug info logged to console");
            }}
            className="btn btn-sm btn-secondary mt-2"
          >
            Debug Info
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "skills", label: "Skills Assessment", icon: Target },
              { id: "courses", label: "Learning Courses", icon: BookOpen },
              { id: "certifications", label: "Certifications", icon: Award },
              { id: "career-paths", label: "Career Paths", icon: TrendingUp },
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
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {userSkills.length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Skills Assessed</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {userSkills.filter(us => us.proficiency_level >= 4).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Strong Skills</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">
                    {displayRecommendations.filter(r => !r.is_completed).length}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Pending Actions</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {userCareerGoal?.current_readiness_percentage || 0}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Career Readiness</div>
                </div>
              </div>
            </div>

            {/* Career Goal Summary */}
            {userCareerGoal && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Career Goal</h3>
                  <button
                    onClick={() => setShowCareerGoalModal(true)}
                    className="btn btn-sm btn-primary"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                </div>
                <div className="card-body">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Target: {userCareerGoal.target_role}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Department: {userCareerGoal.target_department}
                      </p>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Readiness</span>
                          <span>{userCareerGoal.current_readiness_percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${userCareerGoal.current_readiness_percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Skills to Develop ({userCareerGoal.skills_to_develop.length})
                      </h5>
                      <div className="space-y-1">
                        {userCareerGoal.skills_to_develop.slice(0, 3).map((skillId, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{getSkillName(skillId)}</span>
                          </div>
                        ))}
                        {userCareerGoal.skills_to_develop.length > 3 && (
                          <p className="text-xs text-gray-500">+{userCareerGoal.skills_to_develop.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Recommendations */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Recent Recommendations</h3>
              </div>
              <div className="card-body">
                <div className="space-y-4">
                  {displayRecommendations.slice(0, 3).map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getPriorityColor(rec.priority)}`}>
                          <Lightbulb className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                          {rec.priority}
                        </span>
                        {rec.is_completed && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills Assessment Tab */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="heading-2">Skills Assessment</h2>
              <button
                onClick={() => setShowSkillAssessment(true)}
                className="btn btn-primary"
              >
                <Plus className="h-4 w-4" />
                Assess Skills
              </button>
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displaySkills.map((skill) => {
                const userSkill = userSkills.find(us => us.skill_id === skill.id);
                const level = userSkill?.proficiency_level || 0;
                
                return (
                  <div key={skill.id} className="card">
                    <div className="card-body">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{skill.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          level >= 4 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          level >= 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          Level {level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{skill.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{skill.category}</span>
                        <span className="capitalize">{skill.difficulty_level}</span>
                      </div>
                      {level > 0 && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Proficiency</span>
                            <span>{level}/5</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                              style={{ width: `${(level / 5) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="space-y-6">
            <h2 className="heading-2">Learning Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayCourses.map((course) => (
                <div key={course.id} className="card">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        course.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
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
                    {course.course_url && (
                      <a
                        href={course.course_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary w-full"
                      >
                        <BookOpen className="h-4 w-4" />
                        Start Course
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === "certifications" && (
          <div className="space-y-6">
            <h2 className="heading-2">Certifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayCertifications.map((cert) => (
                <div key={cert.id} className="card">
                  <div className="card-body">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{cert.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cert.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        cert.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
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
                    {cert.certification_url && (
                      <a
                        href={cert.certification_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-primary w-full"
                      >
                        <Award className="h-4 w-4" />
                        Learn More
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Career Paths Tab */}
        {activeTab === "career-paths" && (
          <div className="space-y-6">
            <h2 className="heading-2">Career Paths</h2>
            <div className="space-y-6">
              {displayCareerPaths.map((path) => {
                const readiness = getReadinessPercentage(path);
                
                return (
                  <div key={path.id} className="card">
                    <div className="card-body">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{path.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400">{path.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">{readiness}%</div>
                          <div className="text-sm text-gray-500">Readiness</div>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Career Readiness</span>
                          <span>{readiness}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${readiness}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Career Levels</h4>
                          <div className="space-y-2">
                            {path.levels.map((level: any, index: number) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <span className="text-sm font-medium">{level.level}</span>
                                <span className="text-xs text-gray-500">{level.years_experience}+ years</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Required Skills</h4>
                          <div className="space-y-1">
                            {path.required_skills.map((skillId, index) => {
                              const level = getSkillLevel(skillId);
                              return (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm">{getSkillName(skillId)}</span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    level >= 4 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                    level >= 2 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    Level {level}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Recommendations Tab */}
        {activeTab === "recommendations" && (
          <div className="space-y-6">
            <h2 className="heading-2">AI-Powered Recommendations</h2>
            <div className="space-y-4">
              {displayRecommendations.map((rec) => (
                <div key={rec.id} className="card">
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-full ${getPriorityColor(rec.priority)}`}>
                          <Lightbulb className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{rec.title}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(rec.priority)}`}>
                              {rec.priority}
                            </span>
                            {rec.is_completed && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Completed
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{rec.description}</p>
                          <p className="text-sm text-gray-500 mb-3">
                            <strong>Reasoning:</strong> {rec.reasoning}
                          </p>
                          
                          {rec.related_items && (
                            <div className="mt-3">
                              {rec.recommendation_type === "course" && rec.related_items.courses && (
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recommended Courses:</h4>
                                  <div className="space-y-1">
                                    {rec.related_items.courses.map((course: Course, index: number) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                        <span className="text-sm">{course.title}</span>
                                        <span className="text-xs text-gray-500">{course.duration_hours}h</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {rec.recommendation_type === "certification" && rec.related_items.certifications && (
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recommended Certifications:</h4>
                                  <div className="space-y-1">
                                    {rec.related_items.certifications.map((cert: Certification, index: number) => (
                                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                        <span className="text-sm">{cert.name}</span>
                                        <span className="text-xs text-gray-500">${cert.cost}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!rec.is_completed && (
                          <button
                            onClick={() => {
                              // Mark as completed
                              updateDoc(doc(db, "learning_recommendations", rec.id), {
                                is_completed: true,
                                completed_at: new Date().toISOString()
                              }).then(() => {
                                toast.success("Recommendation marked as completed!");
                                fetchCareerData();
                              });
                            }}
                            className="btn btn-sm btn-success"
                          >
                            <CheckCircle className="h-4 w-4" />
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skill Assessment Modal */}
        {showSkillAssessment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Skill Assessment</h3>
                <button
                  onClick={() => setShowSkillAssessment(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {skills.map((skill) => (
                  <div key={skill.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{skill.name}</h4>
                      <span className="text-sm text-gray-500">{skill.category}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{skill.description}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Proficiency Level:</span>
                      <select
                        value={skillAssessment[skill.id] || 0}
                        onChange={(e) => setSkillAssessment({
                          ...skillAssessment,
                          [skill.id]: parseInt(e.target.value)
                        })}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value={0}>Not Assessed</option>
                        <option value={1}>Beginner (1)</option>
                        <option value={2}>Elementary (2)</option>
                        <option value={3}>Intermediate (3)</option>
                        <option value={4}>Advanced (4)</option>
                        <option value={5}>Expert (5)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowSkillAssessment(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSkillAssessment}
                  className="btn btn-primary"
                >
                  Save Assessment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Career Goal Modal */}
        {showCareerGoalModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Career Goal</h3>
                <button
                  onClick={() => setShowCareerGoalModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                handleCareerGoalUpdate({
                  target_role: formData.get('target_role') as string,
                  target_department: formData.get('target_department') as string,
                  target_level: formData.get('target_level') as string,
                  timeline_months: parseInt(formData.get('timeline_months') as string),
                  notes: formData.get('notes') as string
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Role
                    </label>
                    <input
                      type="text"
                      name="target_role"
                      defaultValue={userCareerGoal?.target_role}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Department
                    </label>
                    <select
                      name="target_department"
                      defaultValue={userCareerGoal?.target_department}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Product">Product</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Operations">Operations</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Target Level
                    </label>
                    <select
                      name="target_level"
                      defaultValue={userCareerGoal?.target_level}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Level</option>
                      <option value="Junior">Junior</option>
                      <option value="Mid-level">Mid-level</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                      <option value="Manager">Manager</option>
                      <option value="Director">Director</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Timeline (months)
                    </label>
                    <input
                      type="number"
                      name="timeline_months"
                      defaultValue={userCareerGoal?.timeline_months || 12}
                      min="1"
                      max="60"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      defaultValue={userCareerGoal?.notes}
                      rows={3}
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any additional notes about your career goal..."
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCareerGoalModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                  >
                    Save Goal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 