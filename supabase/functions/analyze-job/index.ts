// analyze-job Edge Function
// Description: Extracts keywords and analyzes job descriptions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import nlp from "https://esm.sh/compromise@14.10.0";
import topics from "https://esm.sh/compromise-topics@0.1.0";

// Configure compromise with plugins
nlp.extend(topics);

// Common technical skills to help with identification
const technicalSkills = [
  "javascript", "typescript", "java", "python", "c++", "c#", "go", "rust", "php", "ruby",
  "react", "angular", "vue", "svelte", "jquery", "next.js", "nuxt.js", "redux", "mobx",
  "node.js", "express", "django", "flask", "spring", "laravel", "rails", "asp.net",
  "html", "css", "sass", "less", "tailwind", "bootstrap", "material-ui", "chakra",
  "mongodb", "postgresql", "mysql", "sqlite", "oracle", "ms sql", "dynamodb", "redis",
  "aws", "azure", "gcp", "firebase", "heroku", "netlify", "vercel", "digitalocean",
  "docker", "kubernetes", "jenkins", "gitlab ci", "github actions", "circleci",
  "git", "subversion", "mercurial", "bash", "powershell", "linux", "windows", "macos",
  "rest", "graphql", "soap", "grpc", "websocket", "apollo", "axios", "fetch",
  "jest", "mocha", "chai", "cypress", "selenium", "playwright", "puppeteer", "testing library",
  "webpack", "rollup", "parcel", "vite", "esbuild", "babel", "typescript", "eslint", "prettier",
  "agile", "scrum", "kanban", "jira", "confluence", "trello", "asana",
  "figma", "sketch", "adobe xd", "photoshop", "illustrator", "indesign"
];

// Common educational terms
const educationTerms = [
  "bachelor", "master", "phd", "doctorate", "degree", "bs", "ms", "ba", "ma", "mba", 
  "computer science", "information technology", "software engineering", "data science",
  "bootcamp", "certification", "licensed", "associate"
];

// Common soft skills
const softSkills = [
  "communication", "teamwork", "problem solving", "critical thinking", "creativity",
  "leadership", "time management", "adaptability", "flexibility", "attention to detail",
  "organization", "conflict resolution", "emotional intelligence", "interpersonal",
  "negotiation", "presentation", "customer service", "decision making", "stress management"
];

// Common job functions
const jobFunctions = [
  "development", "engineering", "design", "testing", "qa", "devops", "architecture",
  "maintenance", "support", "management", "leadership", "analysis", "research",
  "project management", "product management", "data analysis", "administration",
  "marketing", "sales", "finance", "hr", "customer success", "operations"
];

// Common industries
const industries = [
  "technology", "finance", "healthcare", "education", "retail", "manufacturing",
  "consulting", "government", "non-profit", "media", "entertainment", "travel",
  "hospitality", "automotive", "telecommunications", "energy", "aerospace"
];

// CORS headers for response
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define response types
interface KeywordAnalysis {
  keywords: string[];
  required_skills: string[];
  preferred_skills: string[];
  education_requirements: string[];
  experience_level: string | null;
  job_functions: string[];
  industry_sectors: string[];
  tools_technologies: string[];
  soft_skills: string[];
  salary_info: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  } | null;
  location_requirements: string | null;
  remote_options: string | null;
  analysis_quality: number;
  confidence_score: number;
}

// Function to extract salary information
function extractSalary(text: string) {
  // Simple regex pattern to find salary ranges
  const salaryPattern = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:-|to)\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/g;
  const salaryMatches = Array.from(text.matchAll(salaryPattern));
  
  if (salaryMatches.length > 0) {
    const [, min, max] = salaryMatches[0];
    return {
      min: parseFloat(min.replace(/,/g, '')),
      max: parseFloat(max.replace(/,/g, '')),
      currency: 'USD',
      period: 'yearly' // Default assumption
    };
  }
  
  return null;
}

// Function to extract experience level
function extractExperience(text: string) {
  // Look for patterns like "X years", "X+ years", "X-Y years"
  const experiencePattern = /(\d+)(?:\s*\+|\s*\-\s*\d+)?\s*(?:years|yrs|year)/gi;
  const experienceMatches = text.match(experiencePattern);
  
  if (experienceMatches && experienceMatches.length > 0) {
    return experienceMatches[0];
  }
  
  // Look for experience levels
  const levels = ["entry level", "junior", "mid-level", "senior", "lead", "principal", "staff"];
  for (const level of levels) {
    if (text.toLowerCase().includes(level)) {
      return level;
    }
  }
  
  return null;
}

// Function to extract remote work options
function extractRemoteOptions(text: string) {
  if (text.match(/fully\s+remote|100%\s+remote|remote\s+only/i)) {
    return "fully_remote";
  } else if (text.match(/hybrid|flexible|partial\s+remote/i)) {
    return "hybrid";
  } else if (text.match(/on\s*site|in\s*office|on\s*location|in\s*person/i)) {
    return "on_site";
  }
  
  // Default fallback if we see "remote" anywhere
  if (text.match(/remote/i)) {
    return "remote_options_available";
  }
  
  return null;
}

// Function to extract location requirements
function extractLocation(text: string) {
  // This is a simplified approach - would need more sophisticated NLP for full accuracy
  const doc = nlp(text);
  const places = doc.places().out('array');
  
  if (places.length > 0) {
    return places[0]; // Return the first place mentioned
  }
  
  return null;
}

// Main analysis function
function analyzeJobDescription(description: string): KeywordAnalysis {
  // Clean up the text
  const cleanText = description
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();
  
  // Parse with compromise
  const doc = nlp(cleanText);
  
  // Extract all nouns and noun phrases as potential keywords
  const nouns = doc.nouns().out('array');
  const topics = doc.topics().out('array');
  
  // Extract verbs (useful for job functions)
  const verbs = doc.verbs().out('array');
  
  // Combine all potential keywords and normalize
  let allKeywords = [...new Set([...nouns, ...topics])];
  allKeywords = allKeywords
    .map(k => k.toLowerCase())
    .filter(k => k.length > 3 && !["etc", "e.g", "i.e", "example"].includes(k));
  
  // Identify required vs preferred skills
  const requiredSection = cleanText.match(/required|requirements|qualifications|must have|essential/i) 
    ? cleanText.split(/required|requirements|qualifications|must have|essential/i)[1] || "" 
    : "";
    
  const preferredSection = cleanText.match(/preferred|nice to have|desirable|plus|advantage/i)
    ? cleanText.split(/preferred|nice to have|desirable|plus|advantage/i)[1] || ""
    : "";
  
  // Extract skills from sections
  let requiredSkills = technicalSkills.filter(skill => 
    requiredSection.toLowerCase().includes(skill.toLowerCase())
  );
  
  let preferredSkills = technicalSkills.filter(skill => 
    preferredSection.toLowerCase().includes(skill.toLowerCase()) && 
    !requiredSkills.includes(skill)
  );
  
  // If we couldn't identify sections clearly, do a general search
  if (requiredSkills.length === 0) {
    requiredSkills = technicalSkills.filter(skill => 
      cleanText.toLowerCase().includes(skill.toLowerCase()) &&
      !preferredSkills.includes(skill)
    );
  }
  
  // Extract education requirements
  const educationRequirements = educationTerms.filter(term =>
    cleanText.toLowerCase().includes(term.toLowerCase())
  );
  
  // Extract soft skills
  const extractedSoftSkills = softSkills.filter(skill =>
    cleanText.toLowerCase().includes(skill.toLowerCase())
  );
  
  // Extract job functions
  const extractedJobFunctions = jobFunctions.filter(func =>
    cleanText.toLowerCase().includes(func.toLowerCase()) || 
    verbs.some(v => v.toLowerCase().includes(func.toLowerCase()))
  );
  
  // Extract industry sectors
  const extractedIndustries = industries.filter(industry =>
    cleanText.toLowerCase().includes(industry.toLowerCase())
  );
  
  // Extract tools and technologies (from the technical skills)
  const toolsAndTech = requiredSkills.concat(preferredSkills);
  
  // Extract salary information
  const salaryInfo = extractSalary(cleanText);
  
  // Extract experience level
  const experienceLevel = extractExperience(cleanText);
  
  // Extract location and remote work options
  const locationRequirements = extractLocation(cleanText);
  const remoteOptions = extractRemoteOptions(cleanText);
  
  // Calculate confidence and quality scores based on how much we extracted
  const totalPossibleFields = 10; // Number of fields we try to extract
  const fieldsWithData = [
    requiredSkills.length > 0,
    preferredSkills.length > 0,
    educationRequirements.length > 0,
    extractedSoftSkills.length > 0,
    extractedJobFunctions.length > 0,
    extractedIndustries.length > 0,
    toolsAndTech.length > 0,
    salaryInfo !== null,
    experienceLevel !== null,
    locationRequirements !== null || remoteOptions !== null
  ].filter(Boolean).length;
  
  const analysisQuality = fieldsWithData / totalPossibleFields;
  const confidenceScore = Math.min(0.3 + (requiredSkills.length * 0.05), 0.95);
  
  return {
    keywords: allKeywords.slice(0, 50), // Limit to top 50 keywords
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    education_requirements: educationRequirements,
    experience_level: experienceLevel,
    job_functions: extractedJobFunctions,
    industry_sectors: extractedIndustries,
    tools_technologies: toolsAndTech,
    soft_skills: extractedSoftSkills,
    salary_info: salaryInfo,
    location_requirements: locationRequirements,
    remote_options: remoteOptions,
    analysis_quality: analysisQuality,
    confidence_score: confidenceScore
  };
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }
  
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // Get request body
    const { job_id, description } = await req.json();
    
    if (!job_id || !description) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: 'Both job_id and description are required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Analyze the job description
    const analysis = analyzeJobDescription(description);
    
    // Store analysis in the database
    const { data, error } = await supabaseClient.rpc('store_job_analysis', {
      p_job_id: job_id,
      p_keywords: analysis.keywords,
      p_required_skills: analysis.required_skills,
      p_preferred_skills: analysis.preferred_skills,
      p_education_requirements: analysis.education_requirements,
      p_experience_level: analysis.experience_level,
      p_job_functions: analysis.job_functions,
      p_industry_sectors: analysis.industry_sectors,
      p_tools_technologies: analysis.tools_technologies,
      p_soft_skills: analysis.soft_skills,
      p_salary_info: analysis.salary_info,
      p_location_requirements: analysis.location_requirements,
      p_remote_options: analysis.remote_options,
      p_analysis_quality: analysis.analysis_quality,
      p_confidence_score: analysis.confidence_score
    });
    
    if (error) {
      console.error('Error storing analysis:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to store analysis',
          details: error.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Return the analysis
    return new Response(
      JSON.stringify({
        ...analysis,
        analysis_id: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    console.error('Error in analyze-job function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to analyze job description',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
