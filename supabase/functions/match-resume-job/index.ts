import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

interface MatchRequest {
  resumeId: string;
  jobId: string;
  options?: {
    minKeywordScore?: number;
    includeRecommendations?: boolean;
  };
}

interface KeywordMatch {
  keyword: string;
  found: boolean;
  context?: string;
  importance: number;
}

interface SkillMatch {
  skill: string;
  found: boolean;
  importance: number;
}

interface MatchResponse {
  resumeId: string;
  jobId: string;
  overallScore: number;
  keywordScore: number;
  skillScore: number;
  experienceScore: number;
  educationScore: number;
  keywordMatches: KeywordMatch[];
  skillMatches: SkillMatch[];
  missingKeywords: string[];
  missingSkills: string[];
  recommendations: string[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { resumeId, jobId, options = {} } = await req.json() as MatchRequest;

    if (!resumeId || !jobId) {
      throw new Error("Resume ID and Job ID are required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get resume data
    const { data: resumeData, error: resumeError } = await supabase
      .from("resume_versions")
      .select(`
        id,
        content,
        raw_text,
        resume:resumes!inner(id, title)
      `)
      .eq("resume.id", resumeId)
      .eq("is_current", true)
      .single();

    if (resumeError || !resumeData) {
      throw new Error(`Resume not found: ${resumeError?.message || "Not found"}`);
    }

    // Get job data
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !jobData) {
      throw new Error(`Job not found: ${jobError?.message || "Not found"}`);
    }

    // Extract resume content
    const resumeContent = resumeData.content;
    const resumeText = resumeData.raw_text || JSON.stringify(resumeContent);

    // Extract job description
    const jobDescription = jobData.description;
    const jobTitle = jobData.title;
    const company = jobData.company;

    // Perform the matching
    const match = await matchResumeToJob(resumeText, resumeContent, jobDescription, jobTitle, options);

    // Save match results to database
    const { data: matchData, error: matchError } = await supabase
      .from("resume_job_matches")
      .upsert({
        resume_id: resumeId,
        job_id: jobId,
        match_score: match.overallScore,
        match_details: {
          keywordScore: match.keywordScore,
          skillScore: match.skillScore,
          experienceScore: match.experienceScore,
          educationScore: match.educationScore,
          keywordMatches: match.keywordMatches,
          skillMatches: match.skillMatches,
          missingKeywords: match.missingKeywords,
          missingSkills: match.missingSkills,
          recommendations: match.recommendations
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (matchError) {
      throw new Error(`Error saving match results: ${matchError.message}`);
    }

    return new Response(
      JSON.stringify({
        id: matchData.id,
        resumeId,
        jobId,
        ...match
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error matching resume to job:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while matching resume to job"
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

// Main matching function
async function matchResumeToJob(
  resumeText: string,
  resumeContent: any,
  jobDescription: string,
  jobTitle: string,
  options: any
): Promise<MatchResponse> {
  // Extract keywords from job description
  const keywords = extractKeywords(jobDescription, jobTitle);
  
  // Extract skills from job description
  const skills = extractSkills(jobDescription);
  
  // Match keywords
  const keywordMatches = matchKeywords(resumeText, keywords);
  
  // Match skills
  const skillMatches = matchSkills(resumeText, resumeContent, skills);
  
  // Calculate experience match
  const experienceScore = calculateExperienceMatch(resumeContent, jobDescription);
  
  // Calculate education match
  const educationScore = calculateEducationMatch(resumeContent, jobDescription);
  
  // Calculate scores
  const keywordScore = calculateKeywordScore(keywordMatches);
  const skillScore = calculateSkillScore(skillMatches);
  
  // Calculate overall score (weighted average)
  const overallScore = calculateOverallScore(keywordScore, skillScore, experienceScore, educationScore);
  
  // Find missing keywords and skills
  const missingKeywords = keywords
    .filter(k => !keywordMatches.find(m => m.keyword === k.text && m.found))
    .map(k => k.text);
    
  const missingSkills = skills
    .filter(s => !skillMatches.find(m => m.skill === s.text && m.found))
    .map(s => s.text);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    keywordMatches, 
    skillMatches, 
    missingKeywords, 
    missingSkills,
    options.includeRecommendations || false
  );
  
  return {
    resumeId: "",  // Will be filled in by the caller
    jobId: "",     // Will be filled in by the caller
    overallScore,
    keywordScore,
    skillScore,
    experienceScore,
    educationScore,
    keywordMatches,
    skillMatches,
    missingKeywords,
    missingSkills,
    recommendations
  };
}

// Extract keywords from job description
function extractKeywords(jobDescription: string, jobTitle: string): Array<{text: string, importance: number}> {
  // Normalize text
  const text = jobDescription.toLowerCase();
  
  // Common prepositions, articles, and connecting words to exclude
  const stopWords = [
    "a", "an", "the", "and", "or", "but", "for", "with", "in", "on", "at", "to", "from", 
    "of", "by", "about", "as", "into", "like", "through", "after", "over", "between", 
    "out", "against", "during", "without", "before", "under", "around", "among"
  ];
  
  // Split into words and remove stop words
  const words = text.split(/\s+/)
    .map(word => word.replace(/[^\w]/g, ''))  // Remove non-alphanumeric characters
    .filter(word => word.length > 3)          // Only words longer than 3 characters
    .filter(word => !stopWords.includes(word));
    
  // Count word frequency
  const wordCounts: Record<string, number> = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Convert to array of objects
  const keywords = Object.entries(wordCounts)
    .filter(([word, count]) => count > 1)  // Only words that appear more than once
    .map(([word, count]) => ({
      text: word,
      importance: calculateImportance(word, count, jobTitle)
    }))
    .sort((a, b) => b.importance - a.importance)  // Sort by importance
    .slice(0, 30);  // Top 30 keywords
    
  return keywords;
}

// Calculate importance of a keyword
function calculateImportance(word: string, count: number, jobTitle: string): number {
  // Words in the job title are more important
  const inTitle = jobTitle.toLowerCase().includes(word.toLowerCase());
  
  // Base importance is the count
  let importance = count;
  
  // Boost importance if the word is in the title
  if (inTitle) {
    importance *= 1.5;
  }
  
  return importance;
}

// Extract skills from job description
function extractSkills(jobDescription: string): Array<{text: string, importance: number}> {
  // Common technical skills
  const technicalSkills = [
    "javascript", "typescript", "python", "java", "c#", "c++", "ruby", "go", "php", "swift",
    "react", "angular", "vue", "node", "express", "django", "flask", "spring", "asp.net",
    "docker", "kubernetes", "aws", "azure", "gcp", "ci/cd", "jenkins", "github actions",
    "sql", "mysql", "postgresql", "mongodb", "redis", "graphql", "rest", "api",
    "html", "css", "sass", "less", "tailwind", "bootstrap", "material-ui",
    "git", "github", "gitlab", "bitbucket", "jira", "confluence", "agile", "scrum",
    "machine learning", "artificial intelligence", "data science", "big data", "hadoop", "spark",
    "testing", "jest", "mocha", "cypress", "selenium", "tdd", "bdd"
  ];
  
  // Common soft skills
  const softSkills = [
    "communication", "teamwork", "leadership", "problem solving", "critical thinking",
    "creativity", "adaptability", "time management", "organization", "attention to detail",
    "conflict resolution", "decision making", "emotional intelligence", "negotiation",
    "presentation", "public speaking", "writing", "research", "analytical", "strategic thinking"
  ];
  
  // Combined skills list
  const allSkills = [...technicalSkills, ...softSkills];
  
  // Normalize text
  const text = jobDescription.toLowerCase();
  
  // Find skills mentioned in the job description
  const skillMatches = allSkills
    .filter(skill => text.includes(skill))
    .map(skill => ({
      text: skill,
      importance: calculateSkillImportance(skill, text)
    }))
    .sort((a, b) => b.importance - a.importance);
  
  return skillMatches;
}

// Calculate importance of a skill
function calculateSkillImportance(skill: string, jobText: string): number {
  // Count occurrences of the skill
  const regex = new RegExp(`\\b${skill}\\b`, 'gi');
  const matches = jobText.match(regex) || [];
  const count = matches.length;
  
  // Technical skills are slightly more important
  const isTechnical = [
    "javascript", "typescript", "python", "java", "c#", "c++", "react", "angular", 
    "docker", "aws", "sql", "api"
  ].includes(skill);
  
  // Base importance is the count
  let importance = count;
  
  // Boost importance for technical skills
  if (isTechnical) {
    importance *= 1.2;
  }
  
  return importance;
}

// Match keywords in resume
function matchKeywords(resumeText: string, keywords: Array<{text: string, importance: number}>): KeywordMatch[] {
  const normalizedText = resumeText.toLowerCase();
  
  return keywords.map(keyword => {
    const found = normalizedText.includes(keyword.text);
    
    // If found, extract some context
    let context = undefined;
    if (found) {
      const index = normalizedText.indexOf(keyword.text);
      const start = Math.max(0, index - 50);
      const end = Math.min(normalizedText.length, index + keyword.text.length + 50);
      context = "..." + normalizedText.substring(start, end) + "...";
    }
    
    return {
      keyword: keyword.text,
      found,
      context,
      importance: keyword.importance
    };
  });
}

// Match skills in resume
function matchSkills(
  resumeText: string, 
  resumeContent: any, 
  skills: Array<{text: string, importance: number}>
): SkillMatch[] {
  const normalizedText = resumeText.toLowerCase();
  
  // Check for skills in the skills section first if available
  const skillsSection = resumeContent.skills?.list || [];
  
  return skills.map(skill => {
    // Check if skill is explicitly listed in skills section
    const inSkillsSection = Array.isArray(skillsSection) && 
      skillsSection.some((s: string) => s.toLowerCase().includes(skill.text));
      
    // Fall back to searching in the full text
    const inFullText = normalizedText.includes(skill.text);
    
    return {
      skill: skill.text,
      found: inSkillsSection || inFullText,
      importance: skill.importance
    };
  });
}

// Calculate keyword match score (0-100)
function calculateKeywordScore(keywordMatches: KeywordMatch[]): number {
  if (keywordMatches.length === 0) return 0;
  
  // Calculate weighted score based on importance
  const totalImportance = keywordMatches.reduce((sum, match) => sum + match.importance, 0);
  const matchedImportance = keywordMatches
    .filter(match => match.found)
    .reduce((sum, match) => sum + match.importance, 0);
    
  return Math.round((matchedImportance / totalImportance) * 100);
}

// Calculate skill match score (0-100)
function calculateSkillScore(skillMatches: SkillMatch[]): number {
  if (skillMatches.length === 0) return 0;
  
  // Calculate weighted score based on importance
  const totalImportance = skillMatches.reduce((sum, match) => sum + match.importance, 0);
  const matchedImportance = skillMatches
    .filter(match => match.found)
    .reduce((sum, match) => sum + match.importance, 0);
    
  return Math.round((matchedImportance / totalImportance) * 100);
}

// Calculate experience match score based on years and relevance (0-100)
function calculateExperienceMatch(resumeContent: any, jobDescription: string): number {
  // Default to a middle score if we can't calculate
  if (!resumeContent.experience?.items) return 50;
  
  // Get experience items
  const experienceItems = resumeContent.experience.items || [];
  
  // Default score
  let experienceScore = 50;
  
  // If we have experience items, calculate a better score
  if (experienceItems.length > 0) {
    // Estimate total years of experience (simplified)
    const yearsOfExperience = experienceItems.length;
    
    // Normalize job description
    const jobText = jobDescription.toLowerCase();
    
    // Check relevance of experience to job
    let relevanceScore = 0;
    for (const item of experienceItems) {
      const position = (item.position || "").toLowerCase();
      const company = (item.company || "").toLowerCase();
      const description = (item.description || "").toLowerCase();
      
      // Check if experience keywords are in job description
      if (position && jobText.includes(position)) {
        relevanceScore += 20;
      }
      
      // For each important word in the description, check if it's in the job
      const descWords = description.split(/\s+/).filter(w => w.length > 5);
      for (const word of descWords) {
        if (jobText.includes(word)) {
          relevanceScore += 2;
        }
      }
    }
    
    // Cap relevance score
    relevanceScore = Math.min(relevanceScore, 100);
    
    // Combine years and relevance
    experienceScore = Math.round((yearsOfExperience * 10 + relevanceScore) / 2);
    
    // Cap at 100
    experienceScore = Math.min(experienceScore, 100);
  }
  
  return experienceScore;
}

// Calculate education match score (0-100)
function calculateEducationMatch(resumeContent: any, jobDescription: string): number {
  // Default to a middle score if we can't calculate
  if (!resumeContent.education?.items) return 50;
  
  // Get education items
  const educationItems = resumeContent.education.items || [];
  
  // Default score
  let educationScore = 50;
  
  // If we have education items, calculate a better score
  if (educationItems.length > 0) {
    // Normalize job description
    const jobText = jobDescription.toLowerCase();
    
    // Look for education requirements in job
    const hasBachelorRequirement = /bachelor|undergraduate|college degree|university degree/i.test(jobDescription);
    const hasMasterRequirement = /master|graduate degree|ms degree|ma degree/i.test(jobDescription);
    const hasPhDRequirement = /phd|doctorate|doctoral/i.test(jobDescription);
    
    // Check if resume has matching education
    const hasBachelor = educationItems.some(item => 
      /bachelor|bs|ba|b\.s\.|b\.a\.|undergraduate/i.test(item.degree || ""));
      
    const hasMaster = educationItems.some(item => 
      /master|ms|ma|m\.s\.|m\.a\.|graduate/i.test(item.degree || ""));
      
    const hasPhD = educationItems.some(item => 
      /phd|doctorate|doctoral/i.test(item.degree || ""));
    
    // Calculate base score
    if (hasPhDRequirement && hasPhD) {
      educationScore = 100;
    } else if (hasMasterRequirement && (hasMaster || hasPhD)) {
      educationScore = 100;
    } else if (hasBachelorRequirement && (hasBachelor || hasMaster || hasPhD)) {
      educationScore = 100;
    } else if (hasPhDRequirement && !hasPhD) {
      educationScore = 50;
    } else if (hasMasterRequirement && !hasMaster && !hasPhD) {
      educationScore = 60;
    } else if (hasBachelorRequirement && !hasBachelor && !hasMaster && !hasPhD) {
      educationScore = 60;
    }
    
    // Boost for relevant fields
    for (const item of educationItems) {
      const institution = (item.institution || "").toLowerCase();
      const degree = (item.degree || "").toLowerCase();
      const field = (item.description || "").toLowerCase();
      
      // Check if education keywords are in job description
      if (field && jobText.includes(field)) {
        educationScore += 20;
      }
      
      // Look for specific degree fields
      const degreeField = extractDegreeField(degree + " " + field);
      if (degreeField && jobText.includes(degreeField)) {
        educationScore += 20;
      }
    }
    
    // Cap at 100
    educationScore = Math.min(educationScore, 100);
  }
  
  return educationScore;
}

// Extract degree field from degree text
function extractDegreeField(degreeText: string): string | null {
  // Common degree fields
  const fields = [
    "computer science", "cs", "information technology", "it", 
    "engineering", "software engineering", "electrical engineering",
    "business", "mba", "administration", "management",
    "data science", "mathematics", "statistics",
    "biology", "chemistry", "physics",
    "psychology", "sociology", "economics"
  ];
  
  // Check if any fields are mentioned
  for (const field of fields) {
    if (degreeText.includes(field)) {
      return field;
    }
  }
  
  return null;
}

// Calculate overall score from component scores
function calculateOverallScore(
  keywordScore: number,
  skillScore: number,
  experienceScore: number,
  educationScore: number
): number {
  // Weighted average
  return Math.round(
    (keywordScore * 0.2) +
    (skillScore * 0.4) +
    (experienceScore * 0.3) +
    (educationScore * 0.1)
  );
}

// Generate recommendations based on match results
function generateRecommendations(
  keywordMatches: KeywordMatch[],
  skillMatches: SkillMatch[],
  missingKeywords: string[],
  missingSkills: string[],
  includeRecommendations: boolean
): string[] {
  if (!includeRecommendations) {
    return [];
  }
  
  const recommendations: string[] = [];
  
  // Recommend adding missing high-importance skills
  const importantMissingSkills = skillMatches
    .filter(match => !match.found && match.importance >= 3)
    .map(match => match.skill);
    
  if (importantMissingSkills.length > 0) {
    const skillList = importantMissingSkills.slice(0, 5).join(", ");
    recommendations.push(`Add these important skills to your resume: ${skillList}`);
  }
  
  // Recommend adding missing high-importance keywords
  const importantMissingKeywords = keywordMatches
    .filter(match => !match.found && match.importance >= 3)
    .map(match => match.keyword);
    
  if (importantMissingKeywords.length > 0) {
    const keywordList = importantMissingKeywords.slice(0, 5).join(", ");
    recommendations.push(`Include these keywords in your resume: ${keywordList}`);
  }
  
  // General recommendations
  if (skillMatches.filter(match => !match.found).length > 10) {
    recommendations.push("Your skills section needs significant enhancement for this job");
  }
  
  return recommendations;
}
