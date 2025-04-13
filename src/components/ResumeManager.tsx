import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { 
  FileText, 
  Clock, 
  Calendar, 
  Download, 
  Copy, 
  Trash2, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Button, ButtonProps } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/Card';
import { ResumeUpload } from './ResumeUpload';

interface Resume {
  id: string;
  user_id: string;
  title: string;
  file_type: string;
  file_size: number;
  file_path: string;
  original_filename: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  versions?: ResumeVersion[];
  current_version?: ResumeVersion;
}

interface ResumeVersion {
  id: string;
  resume_id: string;
  version_number: number;
  version_name: string | null;
  content: any;
  raw_text?: string;
  created_at: string;
  created_for_job_id: string | null;
  notes: string | null;
  is_current: boolean;
  job?: {
    title: string;
    company: string;
  } | null;
}

export function ResumeManager() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  
  // Load user's resumes on component mount
  useEffect(() => {
    fetchResumes();
  }, []);
  
  const fetchResumes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user's resumes with the current version
      const { data, error: resumesError } = await supabase
        .from('resumes')
        .select(`
          *,
          current_version:resume_versions!inner(
            id, version_number, version_name, created_at, is_current, 
            content, created_for_job_id, notes,
            job:jobs(title, company)
          )
        `)
        .eq('resume_versions.is_current', true)
        .order('updated_at', { ascending: false });
        
      if (resumesError) throw resumesError;
      
      // Process resumes to extract the current version
      const processedResumes = data?.map(resume => {
        const currentVersion = resume.current_version[0];
        return {
          ...resume,
          current_version: currentVersion,
          versions: undefined // Clear the versions array
        };
      }) || [];
      
      setResumes(processedResumes);
    } catch (err) {
      console.error('Error fetching resumes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resumes');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUploadComplete = async (_resumeId: string) => {
    setShowUpload(false);
    await fetchResumes();
  };
  
  const loadVersions = async (resume: Resume) => {
    try {
      setSelectedResume(resume);
      setShowVersions(true);
      
      // Get all versions for the selected resume
      const { data, error: versionsError } = await supabase
        .from('resume_versions')
        .select(`
          id, resume_id, version_number, version_name, created_at, 
          is_current, content, created_for_job_id, notes,
          job:jobs(title, company)
        `)
        .eq('resume_id', resume.id)
        .order('version_number', { ascending: false });
        
      if (versionsError) throw versionsError;
      
      // Update the selected resume with versions
      setSelectedResume({
        ...resume,
        versions: data || []
      });
    } catch (err) {
      console.error('Error loading resume versions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load resume versions');
    }
  };
  
  const downloadResume = async (resumeId: string) => {
    try {
      // Get resume file details
      const { data: resume } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();
      
      if (!resume) {
        throw new Error('Resume not found');
      }
      
      // Get download URL
      const { data, error } = await supabase.storage
        .from('resumes')
        .download(resume.file_path);
        
      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.original_filename || `${resume.title}.${resume.file_path.split('.').pop()}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to download resume');
    }
  };
  
  const deleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Get resume file path
      const { data: resume } = await supabase
        .from('resumes')
        .select('file_path')
        .eq('id', resumeId)
        .single();
      
      if (!resume) {
        throw new Error('Resume not found');
      }
      
      // Delete from database (cascade will delete versions)
      const { error: deleteError } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);
        
      if (deleteError) throw deleteError;
      
      // Delete file from storage
      await supabase.storage
        .from('resumes')
        .remove([resume.file_path]);
      
      // Update local state
      setResumes(resumes.filter(r => r.id !== resumeId));
      
      // Close versions panel if it was showing the deleted resume
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
        setShowVersions(false);
      }
    } catch (err) {
      console.error('Error deleting resume:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete resume');
    }
  };
  
  const setCurrentVersion = async (_resumeId: string, versionId: string) => {
    try {
      // Update the version to be current
      const { error } = await supabase
        .from('resume_versions')
        .update({ is_current: true })
        .eq('id', versionId);
        
      if (error) throw error;
      
      // Reload versions
      if (selectedResume) {
        await loadVersions(selectedResume);
      }
      
      // Refresh main resume list
      await fetchResumes();
    } catch (err) {
      console.error('Error setting current version:', err);
      setError(err instanceof Error ? err.message : 'Failed to update version');
    }
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };
  
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Render resume type icon based on file type
  const renderFileIcon = (_fileType: string) => {
    return <FileText className="h-8 w-8 text-blue-500" />;
  };
  
  if (loading && resumes.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="ml-2 text-gray-600">Loading resumes...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
          <div>
            <p className="font-medium">Error loading resumes</p>
            <p className="text-sm">{error}</p>
            <button 
              onClick={fetchResumes}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">My Resumes</h1>
        <Button onClick={() => setShowUpload(!showUpload)}>
          {showUpload ? 'Cancel' : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Upload Resume
            </>
          )}
        </Button>
      </div>
      
      {/* Upload form */}
      {showUpload && (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <ResumeUpload onUploadComplete={handleUploadComplete} />
          </CardContent>
        </Card>
      )}
      
      {/* Resume versions panel */}
      {showVersions && selectedResume && (
        <Card className="mt-4 border-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-500" />
              Resume Versions: {selectedResume.title}
            </CardTitle>
            <CardDescription>
              View and manage different versions of your resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedResume.versions?.length ? (
              <div className="space-y-4">
                {selectedResume.versions.map(version => (
                  <div 
                    key={version.id}
                    className={`p-4 border rounded-md ${version.is_current ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium flex items-center">
                          Version {version.version_number}
                          {version.version_name && `: ${version.version_name}`}
                          {version.is_current && (
                            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(version.created_at)}
                        </div>
                        {version.created_for_job_id && version.job && (
                          <div className="text-sm text-gray-600 mt-2">
                            Created for: <span className="font-medium">{version.job.title}</span> at {version.job.company}
                          </div>
                        )}
                        {version.notes && (
                          <div className="text-sm mt-2 text-gray-700">
                            {version.notes}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        {!version.is_current && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setCurrentVersion(selectedResume.id, version.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Set as Current
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-6 text-gray-500">
                No versions found for this resume
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="outline" onClick={() => setShowVersions(false)}>
              Close
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {/* Resumes list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {resumes.length === 0 && !loading ? (
          <div className="col-span-2 text-center p-8 border border-dashed rounded-lg">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">No resumes found</h3>
            <p className="text-gray-500 mt-1">Upload your first resume to get started</p>
            <Button className="mt-4" onClick={() => setShowUpload(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
          </div>
        ) : (
          resumes.map(resume => (
            <Card key={resume.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between">
                  <div className="flex items-center">
                    {renderFileIcon(resume.file_type)}
                    <span className="ml-2">{resume.title}</span>
                  </div>
                </CardTitle>
                <CardDescription>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{resume.file_type.split('/').pop()?.toUpperCase()}</span>
                    <span>{formatFileSize(resume.file_size)}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                {resume.current_version && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Current Version:</span> {resume.current_version.version_number}
                      {resume.current_version.version_name && ` - ${resume.current_version.version_name}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last updated: {formatDate(resume.current_version.created_at)}
                    </div>
                    {resume.current_version.created_for_job_id && resume.current_version.job && (
                      <div className="text-sm text-gray-600 mt-1">
                        <span className="font-medium">Customized for:</span> {resume.current_version.job.title} at {resume.current_version.job.company}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4 flex justify-between">
                <Button variant="ghost" size="sm" onClick={() => loadVersions(resume)}>
                  <Clock className="h-4 w-4 mr-2" />
                  Versions
                </Button>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={() => downloadResume(resume.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteResume(resume.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
