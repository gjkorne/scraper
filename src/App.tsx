import React, { useState, useEffect } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import { JobForm } from './components/JobForm';
import { JobList } from './components/JobList';
import { AuthForm } from './components/AuthForm';
import { supabase } from './lib/supabase';
import type { JobPosting, ScrapedData } from './types';

function App() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      if (!user) {
        setJobs([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .order('date_modified', { ascending: false });

        if (error) throw error;
        setJobs(data || []);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [user]);

  const handleJobSubmit = async (url: string, data: ScrapedData) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      const job = {
        url,
        title: data.title,
        company: data.company,
        description: data.description,
        status: 'NEW',
        notes: '',
        user_id: user.id
      };

      const { data: newJob, error } = await supabase
        .from('jobs')
        .insert(job)
        .select()
        .single();

      if (error) throw error;
      setJobs((prev) => [newJob, ...prev]);
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleStatusChange = async (id: string, status: JobPosting['status']) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status, date_modified: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      setJobs((prev) =>
        prev.map((job) =>
          job.id === id
            ? { ...job, status, date_modified: new Date().toISOString() }
            : job
        )
      );
    } catch (error) {
      console.error('Error updating job status:', error);
    }
  };

  const handleJobDelete = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setJobs((prev) => prev.filter((job) => job.id !== id));
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3">
                <Briefcase className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">Job Application Tracker</h1>
              </div>
              <p className="mt-2 text-gray-600">
                Import job postings and track your applications in one place
              </p>
            </div>
            
            {user ? (
              <>
                <JobForm onSubmit={handleJobSubmit} />
                
                {loading ? (
                  <div className="text-center text-gray-500 mt-8">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto mb-2" />
                    <p>Loading your job applications...</p>
                  </div>
                ) : jobs.length > 0 ? (
                  <JobList 
                    jobs={jobs} 
                    onStatusChange={handleStatusChange}
                    onDelete={handleJobDelete}
                  />
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p>No jobs added yet. Start by pasting a job posting URL above.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <AuthForm />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;