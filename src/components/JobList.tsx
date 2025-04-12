import React from 'react';
import { JobPosting } from '../types';
import { CheckCircle2, Clock, FileEdit, Trash2, UserCheck, XCircle } from 'lucide-react';

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
  const StatusIcon = (status: JobPosting['status']) => {
    const Icon = statusIcons[status];
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="w-full max-w-4xl">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {jobs.map((job) => (
            <li key={job.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {job.title}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1.5">
                      {job.company}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 truncate">
                    Added on {new Date(job.dateAdded).toLocaleDateString()}
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
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}