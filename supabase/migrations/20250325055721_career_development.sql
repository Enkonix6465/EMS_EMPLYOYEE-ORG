/*
  # Career Development Schema for LMS
  
  This migration adds tables for personalized career and skill development:
  
  1. skills - Available skills in the organization
  2. user_skills - User's skill assessments and progress
  3. courses - Available learning courses
  4. certifications - Available certifications
  5. career_paths - Defined career progression paths
  6. user_career_goals - User's career goals and progress
  7. learning_recommendations - AI-generated recommendations
*/

-- Skills table
CREATE TABLE skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  department text,
  created_at timestamptz DEFAULT now()
);

-- User skills assessment and progress
CREATE TABLE user_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level integer CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  self_assessment_date timestamptz DEFAULT now(),
  manager_assessment integer CHECK (manager_assessment >= 1 AND manager_assessment <= 5),
  manager_assessment_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, skill_id)
);

-- Courses table
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  duration_hours integer,
  prerequisites text[],
  skills_covered uuid[],
  course_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Certifications table
CREATE TABLE certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  provider text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty_level text CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
  duration_months integer,
  cost decimal(10,2),
  skills_covered uuid[],
  certification_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Career paths table
CREATE TABLE career_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  department text NOT NULL,
  levels jsonb NOT NULL, -- Array of career levels with requirements
  required_skills uuid[],
  recommended_courses uuid[],
  recommended_certifications uuid[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- User career goals and progress
CREATE TABLE user_career_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  target_role text NOT NULL,
  target_department text,
  target_level text,
  current_readiness_percentage integer CHECK (current_readiness_percentage >= 0 AND current_readiness_percentage <= 100),
  skills_to_develop uuid[],
  courses_to_complete uuid[],
  certifications_to_obtain uuid[],
  timeline_months integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Learning recommendations (AI-generated)
CREATE TABLE learning_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  recommendation_type text CHECK (recommendation_type IN ('course', 'certification', 'skill_development', 'career_path')),
  title text NOT NULL,
  description text,
  priority text CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  reasoning text,
  related_items jsonb, -- Courses, certifications, or skills
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies for skills
CREATE POLICY "Users can read all skills" ON skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage skills" ON skills FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Policies for user_skills
CREATE POLICY "Users can read their own skills" ON user_skills FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own skills" ON user_skills FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own skills" ON user_skills FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can read team skills" ON user_skills FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'team_lead', 'project_manager'))
);

-- Policies for courses
CREATE POLICY "Users can read all courses" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courses" ON courses FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Policies for certifications
CREATE POLICY "Users can read all certifications" ON certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage certifications" ON certifications FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Policies for career_paths
CREATE POLICY "Users can read all career paths" ON career_paths FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage career paths" ON career_paths FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Policies for user_career_goals
CREATE POLICY "Users can read their own career goals" ON user_career_goals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own career goals" ON user_career_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own career goals" ON user_career_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can read team career goals" ON user_career_goals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'team_lead', 'project_manager'))
);

-- Policies for learning_recommendations
CREATE POLICY "Users can read their own recommendations" ON learning_recommendations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own recommendations" ON learning_recommendations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own recommendations" ON learning_recommendations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Managers can read team recommendations" ON learning_recommendations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'team_lead', 'project_manager'))
);

-- Insert sample data for skills
INSERT INTO skills (name, category, description, difficulty_level, department) VALUES
('JavaScript', 'Programming', 'Modern JavaScript development including ES6+ features', 'intermediate', 'Engineering'),
('React', 'Frontend', 'React.js library for building user interfaces', 'intermediate', 'Engineering'),
('Node.js', 'Backend', 'Server-side JavaScript runtime', 'intermediate', 'Engineering'),
('Python', 'Programming', 'Python programming language', 'beginner', 'Engineering'),
('SQL', 'Database', 'Structured Query Language for database management', 'beginner', 'Engineering'),
('Project Management', 'Management', 'Project planning, execution, and monitoring', 'intermediate', 'Operations'),
('Leadership', 'Soft Skills', 'Team leadership and people management', 'advanced', 'Human Resources'),
('Communication', 'Soft Skills', 'Effective written and verbal communication', 'beginner', 'Human Resources'),
('Data Analysis', 'Analytics', 'Data analysis and visualization', 'intermediate', 'Product'),
('UI/UX Design', 'Design', 'User interface and user experience design', 'intermediate', 'Design'),
('Sales Techniques', 'Sales', 'Sales strategies and customer relationship management', 'intermediate', 'Sales'),
('Marketing Strategy', 'Marketing', 'Digital marketing and brand strategy', 'intermediate', 'Marketing');

-- Insert sample courses
INSERT INTO courses (title, description, category, difficulty_level, duration_hours, skills_covered) VALUES
('JavaScript Fundamentals', 'Learn the basics of JavaScript programming', 'Programming', 'beginner', 20, ARRAY['JavaScript']),
('React for Beginners', 'Build your first React application', 'Frontend', 'beginner', 30, ARRAY['React', 'JavaScript']),
('Advanced React Patterns', 'Master advanced React concepts and patterns', 'Frontend', 'advanced', 40, ARRAY['React']),
('Node.js Backend Development', 'Build scalable backend applications with Node.js', 'Backend', 'intermediate', 35, ARRAY['Node.js', 'JavaScript']),
('Python for Data Science', 'Learn Python for data analysis and machine learning', 'Programming', 'intermediate', 45, ARRAY['Python', 'Data Analysis']),
('Leadership Essentials', 'Develop essential leadership skills', 'Management', 'intermediate', 25, ARRAY['Leadership', 'Communication']),
('Project Management Professional', 'Comprehensive project management training', 'Management', 'advanced', 60, ARRAY['Project Management']);

-- Insert sample certifications
INSERT INTO certifications (name, provider, description, category, difficulty_level, duration_months, cost, skills_covered) VALUES
('AWS Certified Developer', 'Amazon Web Services', 'Cloud development certification', 'Cloud', 'intermediate', 3, 150.00, ARRAY['JavaScript', 'Node.js']),
('Google Cloud Professional Developer', 'Google', 'Google Cloud Platform development certification', 'Cloud', 'intermediate', 4, 200.00, ARRAY['Python', 'Node.js']),
('PMP Certification', 'PMI', 'Project Management Professional certification', 'Management', 'advanced', 6, 555.00, ARRAY['Project Management']),
('Certified Scrum Master', 'Scrum Alliance', 'Agile project management certification', 'Management', 'intermediate', 2, 995.00, ARRAY['Project Management']),
('Microsoft Azure Developer', 'Microsoft', 'Azure cloud development certification', 'Cloud', 'intermediate', 3, 165.00, ARRAY['JavaScript', 'Node.js']);

-- Insert sample career paths
INSERT INTO career_paths (title, description, department, levels, required_skills, recommended_courses, recommended_certifications) VALUES
('Software Engineer Path', 'Progression from Junior to Senior Software Engineer', 'Engineering', 
  '[
    {"level": "Junior Developer", "requirements": ["JavaScript", "React"], "years_experience": 0},
    {"level": "Mid-level Developer", "requirements": ["JavaScript", "React", "Node.js"], "years_experience": 2},
    {"level": "Senior Developer", "requirements": ["JavaScript", "React", "Node.js", "Leadership"], "years_experience": 5},
    {"level": "Tech Lead", "requirements": ["JavaScript", "React", "Node.js", "Leadership", "Project Management"], "years_experience": 7}
  ]',
  ARRAY['JavaScript', 'React', 'Node.js', 'Leadership', 'Project Management'],
  ARRAY['React for Beginners', 'Advanced React Patterns', 'Node.js Backend Development', 'Leadership Essentials'],
  ARRAY['AWS Certified Developer', 'Google Cloud Professional Developer']
),
('Project Manager Path', 'Progression from Project Coordinator to Senior Project Manager', 'Operations',
  '[
    {"level": "Project Coordinator", "requirements": ["Communication"], "years_experience": 0},
    {"level": "Project Manager", "requirements": ["Project Management", "Communication"], "years_experience": 3},
    {"level": "Senior Project Manager", "requirements": ["Project Management", "Leadership", "Communication"], "years_experience": 6},
    {"level": "Program Manager", "requirements": ["Project Management", "Leadership", "Communication"], "years_experience": 8}
  ]',
  ARRAY['Project Management', 'Leadership', 'Communication'],
  ARRAY['Leadership Essentials', 'Project Management Professional'],
  ARRAY['PMP Certification', 'Certified Scrum Master']
); 