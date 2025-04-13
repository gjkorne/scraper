import { useState, useCallback } from 'react';
// For react-dropzone, use a named import but suppress TypeScript warnings
// @ts-ignore
import { useDropzone } from 'react-dropzone';
import { supabase } from '../utils/supabaseClient';
import { FileText, Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

interface ResumeUploadProps {
  onUploadComplete?: (resumeId: string) => void;
  maxSizeMB?: number;
}

export function ResumeUpload({ onUploadComplete, maxSizeMB = 5 }: ResumeUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [resumeTitle, setResumeTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  
  // Calculate max file size in bytes
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    
    // Validate file size
    if (file.size > maxSizeBytes) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
      return;
    }
    
    // Check file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Please upload a PDF, Word document, or plain text file.');
      return;
    }
    
    // Set file and generate default title
    setSelectedFile(file);
    
    // Generate a default title from the filename (without extension)
    const defaultTitle = file.name.replace(/\.[^/.]+$/, "");
    setResumeTitle(defaultTitle);
    
    // Clear any previous errors
    setError(null);
    setUploadSuccess(false);
  }, [maxSizeBytes, maxSizeMB]);
  
  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });
  
  // Define progress interface
  interface UploadProgress {
    loaded: number;
    total: number;
  }

  // Handle upload to Supabase
  const uploadResume = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    
    if (!resumeTitle.trim()) {
      setError('Please provide a title for your resume');
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to upload a resume');
      }
      
      // Create a unique file path
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      // Ignore TypeScript error for data variable since it's not needed but returned by the API
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          // @ts-ignore - Supabase Storage has onUploadProgress but TypeScript definitions may be outdated
          onUploadProgress: (progress: UploadProgress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
        
      if (uploadError) {
        throw uploadError;
      }
      
      // Create resume record in database
      const { data: resumeData, error: resumeError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          title: resumeTitle,
          file_path: filePath,
          file_type: selectedFile.type,
          file_size: selectedFile.size,
          original_filename: selectedFile.name
        })
        .select()
        .single();
        
      if (resumeError) {
        // Delete the uploaded file if database insert fails
        await supabase.storage.from('resumes').remove([filePath]);
        throw resumeError;
      }
      
      // Trigger resume parsing
      const { error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: { resumeId: resumeData.id }
      });
      
      if (parseError) {
        console.error('Warning: Resume parsing failed, but file was uploaded successfully', parseError);
        // We don't throw here as the upload itself succeeded
      }
      
      // Success!
      setUploadSuccess(true);
      setSelectedFile(null);
      setResumeTitle('');
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(resumeData.id);
      }
      
    } catch (err) {
      console.error('Resume upload error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Upload Resume</h2>
      
      {/* Dropzone */}
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed p-6 rounded-lg text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        
        {selectedFile ? (
          <div className="flex items-center justify-center space-x-2">
            <FileText className="h-8 w-8 text-blue-500" />
            <div className="text-left">
              <p className="font-medium text-gray-700">{selectedFile.name}</p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setResumeTitle('');
              }}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        ) : (
          <div>
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Drag and drop your resume here, or click to select</p>
            <p className="text-sm text-gray-500 mt-1">
              Supports PDF, Word documents, and plain text (Max {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>
      
      {/* Title input field */}
      {selectedFile && (
        <div>
          <label htmlFor="resumeTitle" className="block text-sm font-medium text-gray-700 mb-1">
            Resume Title
          </label>
          <input
            type="text"
            id="resumeTitle"
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
            placeholder="e.g., Software Engineer Resume"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploading}
          />
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {uploadSuccess && !error && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-2" />
            <span>Resume uploaded successfully! We're analyzing your resume now.</span>
          </div>
        </div>
      )}
      
      {/* Upload button */}
      {selectedFile && !uploadSuccess && (
        <div className="flex justify-end">
          <Button
            onClick={uploadResume}
            disabled={uploading || !resumeTitle.trim()}
            className="flex items-center"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {uploadProgress < 100 ? `Uploading ${uploadProgress}%` : 'Processing...'}
              </>
            ) : (
              <>Upload Resume</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
