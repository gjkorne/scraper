import { useState } from 'react';
import { JobPosting } from '../types';
import { CheckCircle2, Clock, FileEdit, Trash2, UserCheck, XCircle, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { JobAnalysis } from './JobAnalysis';

interface JobListProps {
  jobs: JobPosting[];
  onStatusChange: (id: string, status: JobPosting['status']) => void;
  onDelete: (id: string) => void;
}

const statusIcons = {
  NEW: Clock,
  APPLIED: FileEdit,
  INTERVIEWING: UserCheck,
  ACCEPTED: CheckCircle2,
  REJECTED: XCircle,
};

const statusColors = {
  NEW: 'bg-gray-100 text-gray-800',
  APPLIED: 'bg-blue-100 text-blue-800',
  INTERVIEWING: 'bg-purple-100 text-purple-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export function JobList({ jobs, onStatusChange, onDelete }: JobListProps) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [jobsWithAnalysis, setJobsWithAnalysis] = useState<Record<string, string>>({});

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobId(expandedJobId === jobId ? null : jobId);
  };
  
  const handleAnalysisComplete = (jobId: string, analysisId: string) => {
    setJobsWithAnalysis(prev => ({
      ...prev,
      [jobId]: analysisId
    }));
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {jobs.map((job) => (
            <li key={job.id} className="hover:bg-gray-50">
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {job.title}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1.5">
                        {job.company}
                      </span>
                      {jobsWithAnalysis[job.id] && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 gap-1">
                          <Sparkles className="h-3 w-3" />
                          Analyzed
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 truncate">
                      Added on {new Date(job.date_added).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <select
                      value={job.status}
                      onChange={(e) => onStatusChange(job.id, e.target.value as JobPosting['status'])}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        statusColors[job.status]
                      }`}
                    >
                      {Object.keys(statusIcons).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => onDelete(job.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                      title="Delete job"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      View Posting
                    </a>
                    <button
                      onClick={() => toggleJobExpansion(job.id)}
                      className="ml-4 text-gray-600 hover:text-gray-800 p-1 rounded-full hover:bg-gray-200"
                      title={expandedJobId === job.id ? "Hide Analysis" : "Analyze Job"}
                    >
                      {expandedJobId === job.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {expandedJobId === job.id && (
                <div className="px-4 pb-4">
                  <JobAnalysis 
                    jobId={job.id} 
                    jobTitle={job.title}
                    jobDescription={job.description}
                    onAnalysisComplete={(analysisId) => handleAnalysisComplete(job.id, analysisId)}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}