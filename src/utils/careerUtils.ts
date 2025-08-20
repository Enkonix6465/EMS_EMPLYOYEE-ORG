import { db } from "../lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";

export interface SkillGap {
  skillId: string;
  skillName: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface CareerReadiness {
  overallPercentage: number;
  skillGaps: SkillGap[];
  recommendedCourses: string[];
  recommendedCertifications: string[];
  nextSteps: string[];
}

export interface AIRecommendation {
  type: 'course' | 'certification' | 'skill_development' | 'career_path';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  relatedItems: any;
  impact: number; // 1-10 scale
  effort: number; // 1-10 scale
}

/**
 * Calculate skill gaps for a user based on their current skills and target role requirements
 */
export const calculateSkillGaps = (
  userSkills: any[],
  requiredSkills: string[],
  skills: any[]
): SkillGap[] => {
  const gaps: SkillGap[] = [];

  requiredSkills.forEach(skillId => {
    const skill = skills.find(s => s.id === skillId);
    const userSkill = userSkills.find(us => us.skill_id === skillId);
    const currentLevel = userSkill?.proficiency_level || 0;
    const requiredLevel = 4; // Default required level for career advancement

    if (currentLevel < requiredLevel) {
      const gap = requiredLevel - currentLevel;
      let priority: 'low' | 'medium' | 'high' | 'critical' = 'low';
      
      if (gap >= 3) priority = 'critical';
      else if (gap >= 2) priority = 'high';
      else if (gap >= 1) priority = 'medium';

      gaps.push({
        skillId,
        skillName: skill?.name || skillId,
        currentLevel,
        requiredLevel,
        gap,
        priority
      });
    }
  });

  return gaps.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

/**
 * Calculate overall career readiness percentage
 */
export const calculateCareerReadiness = (
  userSkills: any[],
  requiredSkills: string[]
): number => {
  if (requiredSkills.length === 0) return 0;

  const skillLevels = requiredSkills.map(skillId => {
    const userSkill = userSkills.find(us => us.skill_id === skillId);
    return userSkill?.proficiency_level || 0;
  });

  const averageLevel = skillLevels.reduce((sum, level) => sum + level, 0) / skillLevels.length;
  return Math.min(Math.round((averageLevel / 5) * 100), 100);
};

/**
 * Generate AI-powered learning recommendations
 */
export const generateAIRecommendations = async (
  userId: string,
  userSkills: any[],
  skillGaps: SkillGap[],
  courses: any[],
  certifications: any[],
  skills: any[]
): Promise<AIRecommendation[]> => {
  const recommendations: AIRecommendation[] = [];

  // Critical skill gaps - recommend courses
  const criticalGaps = skillGaps.filter(gap => gap.priority === 'critical');
  criticalGaps.forEach(gap => {
    const relatedCourses = courses.filter(course => 
      course.skills_covered.includes(gap.skillId)
    );

    if (relatedCourses.length > 0) {
      recommendations.push({
        type: 'course',
        title: `Master ${gap.skillName}`,
        description: `Take courses to improve your ${gap.skillName} from level ${gap.currentLevel} to level ${gap.requiredLevel}`,
        priority: 'critical',
        reasoning: `Your ${gap.skillName} skill has a ${gap.gap}-level gap, which is critical for career advancement`,
        relatedItems: { courses: relatedCourses.slice(0, 3) },
        impact: 9,
        effort: 7
      });
    }
  });

  // High-level skills - recommend certifications
  const highLevelSkills = userSkills.filter(us => us.proficiency_level >= 4);
  highLevelSkills.forEach(userSkill => {
    const skill = skills.find(s => s.id === userSkill.skill_id);
    const relatedCertifications = certifications.filter(cert => 
      cert.skills_covered.includes(userSkill.skill_id)
    );

    if (skill && relatedCertifications.length > 0) {
      recommendations.push({
        type: 'certification',
        title: `Get ${skill.name} Certification`,
        description: `Validate your ${skill.name} expertise with industry-recognized certification`,
        priority: 'high',
        reasoning: `You have strong ${skill.name} skills (level ${userSkill.proficiency_level}). A certification will enhance your credentials.`,
        relatedItems: { certifications: relatedCertifications.slice(0, 2) },
        impact: 8,
        effort: 5
      });
    }
  });

  // Career path recommendations
  if (skillGaps.length > 0) {
    const mostCriticalGap = skillGaps[0];
    recommendations.push({
      type: 'career_path',
      title: `Focus on ${mostCriticalGap.skillName} Development`,
      description: `Prioritize developing your ${mostCriticalGap.skillName} skills for career advancement`,
      priority: 'high',
      reasoning: `This skill has the largest gap (${mostCriticalGap.gap} levels) and is critical for your target role`,
      relatedItems: { 
        skillGap: mostCriticalGap,
        suggestedTimeline: `${mostCriticalGap.gap * 2} months`
      },
      impact: 8,
      effort: 6
    });
  }

  // Skill development recommendations for medium gaps
  const mediumGaps = skillGaps.filter(gap => gap.priority === 'medium');
  mediumGaps.slice(0, 2).forEach(gap => {
    recommendations.push({
      type: 'skill_development',
      title: `Improve ${gap.skillName} Skills`,
      description: `Focus on developing your ${gap.skillName} through practice and targeted learning`,
      priority: 'medium',
      reasoning: `Your ${gap.skillName} skill needs improvement for career growth`,
      relatedItems: { 
        skillGap: gap,
        practiceResources: ['Online tutorials', 'Practice projects', 'Peer mentoring']
      },
      impact: 6,
      effort: 4
    });
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
};

/**
 * Get personalized career insights
 */
export const getCareerInsights = (
  userSkills: any[],
  skillGaps: SkillGap[],
  careerReadiness: number
): string[] => {
  const insights: string[] = [];

  if (careerReadiness >= 80) {
    insights.push("🎯 You're well-positioned for career advancement!");
    insights.push("💡 Consider pursuing advanced certifications to stand out");
  } else if (careerReadiness >= 60) {
    insights.push("📈 You're making good progress toward your career goals");
    insights.push("🎯 Focus on closing the remaining skill gaps");
  } else if (careerReadiness >= 40) {
    insights.push("🚀 You have a solid foundation to build upon");
    insights.push("📚 Prioritize learning the most critical skills first");
  } else {
    insights.push("🌱 Start with foundational skills to build your career");
    insights.push("📖 Consider taking beginner courses to establish a strong base");
  }

  if (skillGaps.length > 0) {
    const criticalGaps = skillGaps.filter(gap => gap.priority === 'critical');
    if (criticalGaps.length > 0) {
      insights.push(`⚠️ You have ${criticalGaps.length} critical skill gaps to address`);
    }
  }

  const highLevelSkills = userSkills.filter(us => us.proficiency_level >= 4);
  if (highLevelSkills.length > 0) {
    insights.push(`⭐ You excel in ${highLevelSkills.length} areas - leverage these strengths`);
  }

  return insights;
};

/**
 * Calculate career readiness for specific roles
 */
export const calculateRoleReadiness = (
  userSkills: any[],
  roleRequirements: { [role: string]: string[] }
): { [role: string]: number } => {
  const readiness: { [role: string]: number } = {};

  Object.entries(roleRequirements).forEach(([role, requiredSkills]) => {
    const skillLevels = requiredSkills.map(skillId => {
      const userSkill = userSkills.find(us => us.skill_id === skillId);
      return userSkill?.proficiency_level || 0;
    });

    const averageLevel = skillLevels.reduce((sum, level) => sum + level, 0) / skillLevels.length;
    readiness[role] = Math.min(Math.round((averageLevel / 5) * 100), 100);
  });

  return readiness;
};

/**
 * Get recommended career paths based on user skills
 */
export const getRecommendedCareerPaths = (
  userSkills: any[],
  careerPaths: any[]
): any[] => {
  return careerPaths.map(path => {
    const readiness = calculateCareerReadiness(userSkills, path.required_skills);
    return {
      ...path,
      readiness,
      isRecommended: readiness >= 60
    };
  }).sort((a, b) => b.readiness - a.readiness);
};

/**
 * Generate personalized learning plan
 */
export const generateLearningPlan = (
  skillGaps: SkillGap[],
  courses: any[],
  certifications: any[],
  userSkills: any[]
): {
  shortTerm: any[];
  mediumTerm: any[];
  longTerm: any[];
} => {
  const shortTerm: any[] = [];
  const mediumTerm: any[] = [];
  const longTerm: any[] = [];

  // Critical gaps - short term (1-3 months)
  const criticalGaps = skillGaps.filter(gap => gap.priority === 'critical');
  criticalGaps.forEach(gap => {
    const relatedCourses = courses.filter(course => 
      course.skills_covered.includes(gap.skillId) && course.difficulty_level === 'beginner'
    );
    shortTerm.push(...relatedCourses.slice(0, 2));
  });

  // High priority gaps - medium term (3-6 months)
  const highGaps = skillGaps.filter(gap => gap.priority === 'high');
  highGaps.forEach(gap => {
    const relatedCourses = courses.filter(course => 
      course.skills_covered.includes(gap.skillId) && course.difficulty_level === 'intermediate'
    );
    mediumTerm.push(...relatedCourses.slice(0, 2));
  });

  // Certifications - long term (6+ months)
  const highLevelSkills = userSkills.filter(us => us.proficiency_level >= 4);
  highLevelSkills.forEach(userSkill => {
    const relatedCertifications = certifications.filter(cert => 
      cert.skills_covered.includes(userSkill.skill_id)
    );
    longTerm.push(...relatedCertifications.slice(0, 1));
  });

  return { shortTerm, mediumTerm, longTerm };
}; 