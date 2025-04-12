import { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle2, Download, Maximize2, Archive } from 'lucide-react';

interface JobAnalysisProps {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  onAnalysisComplete?: (analysisId: string) => void;
}

interface AnalysisResult {
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
  analysis_id?: string;
}

export function JobAnalysis({ jobId, jobTitle, jobDescription, onAnalysisComplete }: JobAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Toggle a section's expanded state
  const toggleSection = (section: string) => {
    setExpanded(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Run the analysis
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-job`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          job_id: jobId,
          description: jobDescription 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to analyze job description');
      }

      const data = await response.json();
      setAnalysis(data);
      
      if (onAnalysisComplete && data.analysis_id) {
        onAnalysisComplete(data.analysis_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Format the confidence score as a percentage
  const formatConfidence = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  // Map the remote_options value to a user-friendly string
  const formatRemoteOptions = (remote: string | null) => {
    if (!remote) return 'Not specified';
    
    const options: Record<string, string> = {
      'fully_remote': 'Fully Remote',
      'hybrid': 'Hybrid',
      'on_site': 'On-site',
      'remote_options_available': 'Remote options available'
    };
    
    return options[remote] || remote;
  };

  // Format salary information
  const formatSalary = (salary: AnalysisResult['salary_info']) => {
    if (!salary || (!salary.min && !salary.max)) return 'Not specified';
    
    const currency = salary.currency || '$';
    const period = salary.period || 'yearly';
    
    if (salary.min && salary.max) {
      return `${currency}${salary.min.toLocaleString()} - ${currency}${salary.max.toLocaleString()} ${period}`;
    } else if (salary.min) {
      return `${currency}${salary.min.toLocaleString()}+ ${period}`;
    } else if (salary.max) {
      return `Up to ${currency}${salary.max.toLocaleString()} ${period}`;
    }
    
    return 'Not specified';
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">{jobTitle} - Skills Analysis</h2>
      </div>
      
      {!analysis && !loading && !error && (
        <div className="p-6 flex justify-center">
          <button
            onClick={runAnalysis}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Analyze Job Description
          </button>
        </div>
      )}
      
      {loading && (
        <div className="p-12 flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600">Analyzing job description...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      )}
      
      {error && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-md m-4">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Analysis failed</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button 
                onClick={runAnalysis} 
                className="mt-3 text-sm text-red-600 hover:text-red-500 font-medium flex items-center"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
      
      {analysis && (
        <div className="p-4">
          {/* Quality indicators */}
          <div className="mb-6 flex items-center">
            <div className="flex items-center mr-6">
              <div 
                className={`h-2.5 w-2.5 rounded-full mr-2 ${
                  analysis.analysis_quality >= 0.7 ? 'bg-green-500' : 
                  analysis.analysis_quality >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                Analysis Quality: {formatConfidence(analysis.analysis_quality)}
              </span>
            </div>
            <div className="flex items-center">
              <div 
                className={`h-2.5 w-2.5 rounded-full mr-2 ${
                  analysis.confidence_score >= 0.7 ? 'bg-green-500' : 
                  analysis.confidence_score >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                Confidence: {formatConfidence(analysis.confidence_score)}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Required Skills */}
            <div className="border border-gray-200 rounded-md p-4">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('required_skills')}
              >
                <h3 className="text-md font-medium text-gray-800 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                  Required Skills
                </h3>
                <Maximize2 className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className={expanded.required_skills ? "mt-3" : "mt-3 max-h-32 overflow-hidden"}>
                {analysis.required_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.required_skills.map(skill => (
                      <span 
                        key={skill}
                        className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No required skills identified</p>
                )}
              </div>
              
              {analysis.required_skills.length > 5 && !expanded.required_skills && (
                <button 
                  onClick={() => toggleSection('required_skills')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-500"
                >
                  Show all {analysis.required_skills.length} skills
                </button>
              )}
            </div>
            
            {/* Preferred Skills */}
            <div className="border border-gray-200 rounded-md p-4">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('preferred_skills')}
              >
                <h3 className="text-md font-medium text-gray-800 flex items-center">
                  <CheckCircle2 className="h-4 w-4 text-blue-500 mr-2" />
                  Preferred Skills
                </h3>
                <Maximize2 className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className={expanded.preferred_skills ? "mt-3" : "mt-3 max-h-32 overflow-hidden"}>
                {analysis.preferred_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.preferred_skills.map(skill => (
                      <span 
                        key={skill}
                        className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No preferred skills identified</p>
                )}
              </div>
              
              {analysis.preferred_skills.length > 5 && !expanded.preferred_skills && (
                <button 
                  onClick={() => toggleSection('preferred_skills')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-500"
                >
                  Show all {analysis.preferred_skills.length} skills
                </button>
              )}
            </div>
            
            {/* Experience & Education */}
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="text-md font-medium text-gray-800 mb-3">Experience & Education</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Experience:</span>
                  <p className="text-sm text-gray-800">{analysis.experience_level || 'Not specified'}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Education:</span>
                  {analysis.education_requirements.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysis.education_requirements.map(edu => (
                        <span 
                          key={edu}
                          className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded"
                        >
                          {edu}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-800">Not specified</p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Location & Salary */}
            <div className="border border-gray-200 rounded-md p-4">
              <h3 className="text-md font-medium text-gray-800 mb-3">Location & Compensation</h3>
              
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Location:</span>
                  <p className="text-sm text-gray-800">{analysis.location_requirements || 'Not specified'}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Remote Options:</span>
                  <p className="text-sm text-gray-800">{formatRemoteOptions(analysis.remote_options)}</p>
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Salary Range:</span>
                  <p className="text-sm text-gray-800">{formatSalary(analysis.salary_info)}</p>
                </div>
              </div>
            </div>
            
            {/* Soft Skills */}
            <div className="border border-gray-200 rounded-md p-4">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('soft_skills')}
              >
                <h3 className="text-md font-medium text-gray-800">Soft Skills</h3>
                <Maximize2 className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className={expanded.soft_skills ? "mt-3" : "mt-3 max-h-32 overflow-hidden"}>
                {analysis.soft_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {analysis.soft_skills.map(skill => (
                      <span 
                        key={skill}
                        className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No soft skills identified</p>
                )}
              </div>
              
              {analysis.soft_skills.length > 5 && !expanded.soft_skills && (
                <button 
                  onClick={() => toggleSection('soft_skills')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-500"
                >
                  Show all {analysis.soft_skills.length} skills
                </button>
              )}
            </div>
            
            {/* Industry & Job Functions */}
            <div className="border border-gray-200 rounded-md p-4">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleSection('industry')}
              >
                <h3 className="text-md font-medium text-gray-800">Industry & Job Functions</h3>
                <Maximize2 className="h-4 w-4 text-gray-400" />
              </div>
              
              <div className={expanded.industry ? "mt-3" : "mt-3 max-h-32 overflow-hidden"}>
                <div className="mb-3">
                  <span className="text-sm font-medium text-gray-500">Industry Sectors:</span>
                  {analysis.industry_sectors.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysis.industry_sectors.map(industry => (
                        <span 
                          key={industry}
                          className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded"
                        >
                          {industry}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No industries identified</p>
                  )}
                </div>
                
                <div>
                  <span className="text-sm font-medium text-gray-500">Job Functions:</span>
                  {analysis.job_functions.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {analysis.job_functions.map(func => (
                        <span 
                          key={func}
                          className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded"
                        >
                          {func}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No job functions identified</p>
                  )}
                </div>
              </div>
              
              {(analysis.industry_sectors.length + analysis.job_functions.length > 5) && !expanded.industry && (
                <button 
                  onClick={() => toggleSection('industry')}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-500"
                >
                  Show all
                </button>
              )}
            </div>
          </div>
          
          {/* Keywords */}
          <div className="mt-4 border border-gray-200 rounded-md p-4">
            <div 
              className="flex justify-between items-center cursor-pointer"
              onClick={() => toggleSection('keywords')}
            >
              <h3 className="text-md font-medium text-gray-800">All Keywords</h3>
              <Maximize2 className="h-4 w-4 text-gray-400" />
            </div>
            
            <div className={expanded.keywords ? "mt-3" : "mt-3 max-h-32 overflow-hidden"}>
              {analysis.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {analysis.keywords.map(keyword => (
                    <span 
                      key={keyword}
                      className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No keywords identified</p>
              )}
            </div>
            
            {analysis.keywords.length > 15 && !expanded.keywords && (
              <button 
                onClick={() => toggleSection('keywords')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-500"
              >
                Show all {analysis.keywords.length} keywords
              </button>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="mt-6 flex justify-end space-x-3">
            <button 
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm flex items-center"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export
            </button>
            
            <button 
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm flex items-center"
            >
              <Archive className="h-4 w-4 mr-1.5" />
              Save to Resume
            </button>
            
            <button 
              onClick={runAnalysis}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Reanalyze
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
