import React, { useState, useEffect } from "react";
import { TrendingUp, BookOpen, Award, Target, Lightbulb, ArrowRight } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getCareerInsights, calculateSkillGaps, calculateCareerReadiness } from "../utils/careerUtils";

interface CareerInsightsProps {
  className?: string;
}

export default function CareerInsights({ className = "" }: CareerInsightsProps) {
  const { user } = useAuthStore();
  const [insights, setInsights] = useState<string[]>([]);
  const [careerReadiness, setCareerReadiness] = useState(0);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      fetchCareerInsights();
    }
  }, [user?.uid]);

  const fetchCareerInsights = async () => {
    try {
      setLoading(true);
      
      // Fetch user's career data with error handling
      let userSkills: any[] = [];
      let skills: any[] = [];

      try {
        const userSkillsSnap = await getDocs(query(collection(db, "user_skills"), where("user_id", "==", user!.uid)));
        userSkills = userSkillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.log("User skills collection not found");
        userSkills = [];
      }

      try {
        const skillsSnap = await getDocs(collection(db, "skills"));
        skills = skillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.log("Skills collection not found, using default skills");
        skills = [
          { id: "js", name: "JavaScript" },
          { id: "react", name: "React" },
          { id: "node", name: "Node.js" },
          { id: "python", name: "Python" },
          { id: "sql", name: "SQL" },
          { id: "pm", name: "Project Management" },
          { id: "leadership", name: "Leadership" },
          { id: "communication", name: "Communication" }
        ];
      }

      // Calculate insights
      const gaps = calculateSkillGaps(userSkills, skills.map(s => s.id), skills);
      const readiness = calculateCareerReadiness(userSkills, skills.map(s => s.id));
      const careerInsights = getCareerInsights(userSkills, gaps, readiness);

      setUserSkills(userSkills);
      setSkillGaps(gaps);
      setCareerReadiness(readiness);
      setInsights(careerInsights);

    } catch (error) {
      console.error("Error fetching career insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="card-body">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userSkills.length === 0) {
    return (
      <div className={`card ${className}`}>
        <div className="card-body text-center">
          <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Start Your Career Journey
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Assess your skills and set career goals to get personalized recommendations
          </p>
          <a
            href="/career-development"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            Career Development
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <h3 className="card-title flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Career Insights
        </h3>
      </div>
      <div className="card-body">
        {/* Career Readiness */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Career Readiness
            </span>
            <span className="text-sm font-bold text-blue-600">
              {careerReadiness}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${careerReadiness}%` }}
            ></div>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-3">
          {insights.slice(0, 3).map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 dark:text-gray-300">{insight}</p>
            </div>
          ))}
        </div>

        {/* Skill Gaps Summary */}
        {skillGaps.length > 0 && (
          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Skill Gaps to Address
              </span>
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              You have {skillGaps.length} skill gaps. Focus on the most critical ones first.
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4">
          <a
            href="/career-development"
            className="btn btn-sm btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            View Full Analysis
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
} 