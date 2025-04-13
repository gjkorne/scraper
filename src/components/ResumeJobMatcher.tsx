import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './ui/Button';
import { Loader2, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface MatchResult {
  id?: string;
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

interface Resume {
  id: string;
  title: string;
  created_at: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  date_added: string;
}

interface ResumeJobMatcherProps {
  jobId?: string; // Optional: If provided, will pre-select this job
  resumeId?: string; // Optional: If provided, will pre-select this resume
}

export default function ResumeJobMatcher({ jobId: initialJobId, resumeId: initialResumeId }: ResumeJobMatcherProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(initialResumeId || null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(initialJobId || null);
  
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    keywords: false,
    skills: false,
    recommendations: true
  });
  
  // Fetch user's resumes and jobs on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get user's resumes
        const { data: resumeData, error: resumeError } = await supabase
          .from('resumes')
          .select('id, title, created_at')
          .order('created_at', { ascending: false });
          
        if (resumeError) throw new Error(`Error fetching resumes: ${resumeError.message}`);
        
        // Get user's jobs
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select('id, title, company, date_added')
          .order('date_added', { ascending: false });
          
        if (jobError) throw new Error(`Error fetching jobs: ${jobError.message}`);
        
        setResumes(resumeData || []);
        setJobs(jobData || []);
        
        // If we have pre-selected IDs, check if a match result exists
        if (initialResumeId && initialJobId) {
          const { data: existingMatch, error: matchError } = await supabase
            .from('resume_job_matches')
            .select('*')
            .eq('resume_id', initialResumeId)
            .eq('job_id', initialJobId)
            .single();
            
          if (!matchError && existingMatch) {
            // Format the match result
            setMatchResult({
              id: existingMatch.id,
              resumeId: existingMatch.resume_id,
              jobId: existingMatch.job_id,
              overallScore: existingMatch.match_score,
              ...existingMatch.match_details
            });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [initialResumeId, initialJobId]);
  
  // Handle matching resume with job
  const handleMatchResumeJob = async () => {
    if (!selectedResumeId || !selectedJobId) {
      setError('Please select both a resume and a job to match');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Check if we already have a match result
      const { data: existingMatch, error: matchError } = await supabase
        .from('resume_job_matches')
        .select('*')
        .eq('resume_id', selectedResumeId)
        .eq('job_id', selectedJobId)
        .single();
        
      if (!matchError && existingMatch) {
        // Use existing match
        setMatchResult({
          id: existingMatch.id,
          resumeId: existingMatch.resume_id,
          jobId: existingMatch.job_id,
          overallScore: existingMatch.match_score,
          ...existingMatch.match_details
        });
        setSuccess(true);
      } else {
        // Call the edge function to create a new match
        const { data, error } = await supabase.functions.invoke('match-resume-job', {
          body: {
            resumeId: selectedResumeId,
            jobId: selectedJobId,
            options: {
              includeRecommendations: true
            }
          }
        });
        
        if (error) throw new Error(`Error matching resume to job: ${error.message}`);
        
        setMatchResult(data);
        setSuccess(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Toggle expanded sections
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  // Format scores with color coding
  const formatScore = (score: number) => {
    let colorClass = 'text-yellow-500';
    
    if (score >= 80) {
      colorClass = 'text-green-500';
    } else if (score <= 40) {
      colorClass = 'text-red-500';
    }
    
    return <span className={colorClass}>{score}%</span>;
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Resume-Job Matcher</h2>
      
      {/* Selection Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Resume
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedResumeId || ''}
            onChange={(e) => setSelectedResumeId(e.target.value || null)}
          >
            <option value="">Select a resume...</option>
            {resumes.map((resume) => (
              <option key={resume.id} value={resume.id}>
                {resume.title}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Job
          </label>
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedJobId || ''}
            onChange={(e) => setSelectedJobId(e.target.value || null)}
          >
            <option value="">Select a job...</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} at {job.company}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Match Button */}
      <div className="flex justify-center mb-8">
        <Button
          onClick={handleMatchResumeJob}
          disabled={loading || !selectedResumeId || !selectedJobId}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Match Resume to Job'
          )}
        </Button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Match Results */}
      {matchResult && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h3 className="text-xl font-semibold">Match Results</h3>
          </div>
          
          {/* Overall Score */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium">Overall Match Score</h4>
              <div className="text-3xl font-bold">{formatScore(matchResult.overallScore)}</div>
            </div>
            
            {/* Score Breakdown */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Keywords</p>
                <p className="text-xl font-semibold mt-1">{formatScore(matchResult.keywordScore)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Skills</p>
                <p className="text-xl font-semibold mt-1">{formatScore(matchResult.skillScore)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Experience</p>
                <p className="text-xl font-semibold mt-1">{formatScore(matchResult.experienceScore)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-500">Education</p>
                <p className="text-xl font-semibold mt-1">{formatScore(matchResult.educationScore)}</p>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="border-b border-gray-200">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 focus:outline-none"
              onClick={() => toggleSection('recommendations')}
            >
              <h4 className="text-lg font-medium">Recommendations</h4>
              {expandedSections.recommendations ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            
            {expandedSections.recommendations && (
              <div className="p-4 bg-gray-50">
                {matchResult.recommendations.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-2">
                    {matchResult.recommendations.map((rec, index) => (
                      <li key={index} className="text-gray-700">{rec}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500">No specific recommendations available.</p>
                )}
              </div>
            )}
          </div>
          
          {/* Missing Skills */}
          <div className="border-b border-gray-200">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 focus:outline-none"
              onClick={() => toggleSection('skills')}
            >
              <h4 className="text-lg font-medium">Missing Skills & Keywords</h4>
              {expandedSections.skills ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            
            {expandedSections.skills && (
              <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium mb-2">Missing Skills</h5>
                  {matchResult.missingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {matchResult.missingSkills.map((skill, index) => (
                        <span 
                          key={index} 
                          className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-sm"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No missing skills detected!</p>
                  )}
                </div>
                
                <div>
                  <h5 className="font-medium mb-2">Missing Keywords</h5>
                  {matchResult.missingKeywords.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {matchResult.missingKeywords.map((keyword, index) => (
                        <span 
                          key={index} 
                          className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No missing keywords detected!</p>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Keyword Matches */}
          <div className="border-b border-gray-200">
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 focus:outline-none"
              onClick={() => toggleSection('keywords')}
            >
              <h4 className="text-lg font-medium">Keyword Match Details</h4>
              {expandedSections.keywords ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>
            
            {expandedSections.keywords && (
              <div className="p-4 bg-gray-50">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Found</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Importance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {matchResult.keywordMatches
                        .sort((a, b) => b.importance - a.importance)
                        .map((match, index) => (
                          <tr key={index} className={match.found ? '' : 'bg-red-50'}>
                            <td className="px-4 py-2 text-sm">{match.keyword}</td>
                            <td className="px-4 py-2 text-sm">
                              {match.found ? (
                                <Check className="h-5 w-5 text-green-500" />
                              ) : (
                                <span className="text-red-500">Missing</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {'★'.repeat(Math.min(Math.ceil(match.importance), 5))}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
