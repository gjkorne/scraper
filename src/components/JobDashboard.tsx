import { useState, useEffect } from 'react';
import { JobAnalysis } from './JobAnalysis';
import { JobAnalysisVisualizations } from './JobAnalysisVisualizations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/Tabs';
import { Button } from './ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/Card';
import { ClipboardList, BarChart3, FileText, ArrowRight } from 'lucide-react';

interface JobDashboardProps {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  companyName: string;
  resumeId?: string;
}

export function JobDashboard({ 
  jobId, 
  jobTitle, 
  jobDescription, 
  companyName, 
  resumeId 
}: JobDashboardProps) {
  const [activeTab, setActiveTab] = useState('analysis');
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

  // Handle when analysis is completed
  const handleAnalysisComplete = (newAnalysisId: string) => {
    setAnalysisId(newAnalysisId);
    setIsAnalysisComplete(true);
  };

  // Check if there's an existing analysis when component loads
  useEffect(() => {
    const checkExistingAnalysis = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/job-analysis-status`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ job_id: jobId }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.analysis_id) {
            setAnalysisId(data.analysis_id);
            setIsAnalysisComplete(true);
          }
        }
      } catch (error) {
        console.error("Error checking analysis status:", error);
      }
    };

    checkExistingAnalysis();
  }, [jobId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{jobTitle}</CardTitle>
          <CardDescription>{companyName}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analysis" className="flex items-center">
                <ClipboardList className="h-4 w-4 mr-2" />
                Analysis
              </TabsTrigger>
              <TabsTrigger 
                value="visualizations" 
                className="flex items-center"
                disabled={!isAnalysisComplete}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Visualizations
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="analysis" className="mt-4">
              <JobAnalysis 
                jobId={jobId}
                jobTitle={jobTitle}
                jobDescription={jobDescription}
                onAnalysisComplete={handleAnalysisComplete}
              />
            </TabsContent>
            
            <TabsContent value="visualizations" className="mt-4">
              {isAnalysisComplete ? (
                <JobAnalysisVisualizations
                  analysisId={analysisId}
                  jobId={jobId}
                  jobTitle={jobTitle}
                  resumeId={resumeId}
                />
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                  <p className="text-gray-500 mb-3">Complete the analysis to view visualizations</p>
                  <Button 
                    onClick={() => setActiveTab('analysis')}
                    variant="outline"
                    className="inline-flex items-center"
                  >
                    Go to Analysis <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {isAnalysisComplete ? (
              <span className="flex items-center">
                <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
                Analysis complete
              </span>
            ) : (
              <span className="flex items-center">
                <span className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></span>
                Pending analysis
              </span>
            )}
          </div>
          <div>
            <Button variant="outline" className="mr-2" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              View Job
            </Button>
            <Button size="sm">
              Customize Resume
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
