import { useState, useEffect } from 'react';
import { Loader2, BarChart3, PieChart, LineChart, Zap, Layers, UsersRound } from 'lucide-react';

interface JobAnalysisVisualizationsProps {
  analysisId: string | null;
  jobId: string;
  jobTitle: string;
  resumeId?: string;
}

interface SkillMatchData {
  matching_skills: string[];
  missing_skills: string[];
  partial_matches: Array<{skill: string, confidence: number}>;
  match_percentage: number;
  recommendations: string[];
}

interface KeywordDistribution {
  technical_skills: number;
  soft_skills: number;
  industry_knowledge: number;
  tools: number;
  certifications: number;
  education: number;
  experience: number;
}

export function JobAnalysisVisualizations({ 
  analysisId, 
  jobId, 
  jobTitle,
  resumeId 
}: JobAnalysisVisualizationsProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'keywords' | 'match'>('skills');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillMatch, setSkillMatch] = useState<SkillMatchData | null>(null);
  const [keywordDistribution, setKeywordDistribution] = useState<KeywordDistribution | null>(null);

  // Fetch skill match data if a resumeId is provided
  useEffect(() => {
    if (analysisId && resumeId) {
      fetchSkillMatch();
    }
  }, [analysisId, resumeId]);

  // Fetch keyword distribution data when analysis ID is available
  useEffect(() => {
    if (analysisId) {
      fetchKeywordDistribution();
    }
  }, [analysisId]);

  const fetchSkillMatch = async () => {
    if (!resumeId || !analysisId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match-skills`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          job_analysis_id: analysisId,
          resume_id: resumeId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch skill match data');
      }

      const data = await response.json();
      setSkillMatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Error fetching skill match:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKeywordDistribution = async () => {
    if (!analysisId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/keyword-stats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis_id: analysisId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch keyword statistics');
      }

      const data = await response.json();
      setKeywordDistribution(data.distribution);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Error fetching keyword distribution:', err);
    } finally {
      setLoading(false);
    }
  };

  // Render skills distribution chart
  const renderSkillsChart = () => {
    if (!keywordDistribution) {
      return (
        <div className="text-center p-8 text-gray-500">
          No keyword data available
        </div>
      );
    }

    const categoryColors = {
      technical_skills: 'bg-blue-500',
      soft_skills: 'bg-green-500',
      industry_knowledge: 'bg-purple-500',
      tools: 'bg-yellow-500',
      certifications: 'bg-red-500',
      education: 'bg-indigo-500',
      experience: 'bg-pink-500'
    };
    
    const maxValue = Math.max(...Object.values(keywordDistribution));
    
    return (
      <div className="p-4">
        <h3 className="text-md font-medium text-gray-800 mb-4">Keyword Distribution</h3>
        
        <div className="space-y-3">
          {Object.entries(keywordDistribution).map(([category, count]) => (
            <div key={category} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span className="text-gray-500">{count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`${categoryColors[category as keyof typeof categoryColors]} h-2.5 rounded-full`} 
                  style={{ width: `${(count / maxValue) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render skill match visualization
  const renderSkillMatch = () => {
    if (!skillMatch) {
      return (
        <div className="flex flex-col items-center justify-center p-8 space-y-4">
          {resumeId ? (
            <>
              <p className="text-gray-500">No skill match data available</p>
              <button 
                onClick={fetchSkillMatch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Match with Resume
              </button>
            </>
          ) : (
            <p className="text-gray-500">Upload or select a resume to see skill matches</p>
          )}
        </div>
      );
    }

    // Create a circular progress visualization
    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (skillMatch.match_percentage / 100) * circumference;

    return (
      <div className="p-4">
        <h3 className="text-md font-medium text-gray-800 mb-4">Resume Match Analysis</h3>
        
        {/* Circular progress chart */}
        <div className="flex justify-center mb-6">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-40 h-40" viewBox="0 0 200 200">
              {/* Background circle */}
              <circle 
                cx="100" cy="100" r={radius} 
                stroke="#e5e7eb" 
                strokeWidth="12" 
                fill="transparent" 
              />
              
              {/* Progress circle */}
              <circle 
                cx="100" cy="100" r={radius} 
                stroke={skillMatch.match_percentage >= 70 ? "#10b981" : 
                       skillMatch.match_percentage >= 40 ? "#f59e0b" : "#ef4444"} 
                strokeWidth="12" 
                fill="transparent" 
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                transform="rotate(-90 100 100)"
              />
              
              {/* Percentage text */}
              <text 
                x="100" y="100" 
                textAnchor="middle" 
                dominantBaseline="middle"
                className="text-2xl font-bold"
                fill="#374151"
              >
                {Math.round(skillMatch.match_percentage)}%
              </text>
              
              <text 
                x="100" y="120" 
                textAnchor="middle" 
                dominantBaseline="middle"
                className="text-xs"
                fill="#6b7280"
              >
                Match
              </text>
            </svg>
          </div>
        </div>
        
        {/* Matching skills section */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Matching Skills ({skillMatch.matching_skills.length})</h4>
          <div className="flex flex-wrap gap-2">
            {skillMatch.matching_skills.map(skill => (
              <span key={skill} className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {skill}
              </span>
            ))}
            {skillMatch.matching_skills.length === 0 && (
              <span className="text-sm text-gray-500 italic">No direct skill matches found</span>
            )}
          </div>
        </div>
        
        {/* Missing skills section */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Missing Skills ({skillMatch.missing_skills.length})</h4>
          <div className="flex flex-wrap gap-2">
            {skillMatch.missing_skills.map(skill => (
              <span key={skill} className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded">
                {skill}
              </span>
            ))}
            {skillMatch.missing_skills.length === 0 && (
              <span className="text-sm text-gray-500 italic">No missing skills identified</span>
            )}
          </div>
        </div>
        
        {/* Recommendations section */}
        {skillMatch.recommendations.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Recommendations</h4>
            <ul className="list-disc pl-5 space-y-1">
              {skillMatch.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-blue-700">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  // Render keywords network visualization
  const renderKeywordsNetwork = () => {
    // This would ideally use a proper graph visualization library like react-force-graph
    // For now, we'll use a simplified representation
    return (
      <div className="p-4">
        <h3 className="text-md font-medium text-gray-800 mb-4">Keyword Relationships</h3>
        
        <div className="h-64 bg-gray-100 rounded-md flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-gray-500 mb-2">Interactive keyword network visualization</p>
            <p className="text-sm text-gray-400">
              (This visualization requires a graph library integration)
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading visualization data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-sm font-medium text-red-800 mb-1">Error loading visualizations</h3>
        <p className="text-sm text-red-700">{error}</p>
        <button 
          onClick={() => {
            setError(null);
            activeTab === 'skills' ? fetchKeywordDistribution() : fetchSkillMatch();
          }} 
          className="mt-3 text-sm text-red-600 hover:text-red-500 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!analysisId) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Run analysis to see visualizations</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm border border-gray-200 mt-4">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">{jobTitle} - Visual Analysis</h2>
      </div>
      
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-3 text-sm font-medium flex items-center ${
            activeTab === 'skills'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Skill Distribution
        </button>
        
        <button
          onClick={() => setActiveTab('match')}
          className={`px-4 py-3 text-sm font-medium flex items-center ${
            activeTab === 'match'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Layers className="h-4 w-4 mr-2" />
          Resume Match
        </button>
        
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-4 py-3 text-sm font-medium flex items-center ${
            activeTab === 'keywords'
              ? 'text-blue-600 border-b-2 border-blue-500'
              : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
          }`}
        >
          <Zap className="h-4 w-4 mr-2" />
          Keyword Network
        </button>
      </div>
      
      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'skills' && renderSkillsChart()}
        {activeTab === 'match' && renderSkillMatch()}
        {activeTab === 'keywords' && renderKeywordsNetwork()}
      </div>
    </div>
  );
}
