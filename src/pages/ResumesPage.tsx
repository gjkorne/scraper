import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { ResumeManager } from '../components/ResumeManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Button, ButtonProps } from '../components/ui/Button';
import { 
  FileText, 
  Briefcase, 
  LineChart,
  BarChart3,
  Settings,
  RefreshCw
} from 'lucide-react';

export function ResumesPage() {
  const [activeTab, setActiveTab] = useState<string>('manage');
  
  return (
    <div className="container mx-auto py-6 max-w-6xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Resume Management</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Resume Tools</CardTitle>
              <CardDescription>
                Tools to manage and optimize your resumes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="flex flex-col p-2">
                <Button 
                  variant={activeTab === 'manage' ? 'default' : 'ghost'} 
                  className="justify-start mb-1 font-normal"
                  onClick={() => setActiveTab('manage')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Manage Resumes
                </Button>
                <Button 
                  variant={activeTab === 'job-match' ? 'default' : 'ghost'} 
                  className="justify-start mb-1 font-normal"
                  onClick={() => setActiveTab('job-match')}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Job Matching
                </Button>
                <Button 
                  variant={activeTab === 'analytics' ? 'default' : 'ghost'} 
                  className="justify-start mb-1 font-normal"
                  onClick={() => setActiveTab('analytics')}
                >
                  <LineChart className="h-4 w-4 mr-2" />
                  Resume Analytics
                </Button>
                <Button 
                  variant={activeTab === 'skills' ? 'default' : 'ghost'} 
                  className="justify-start font-normal"
                  onClick={() => setActiveTab('skills')}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Skills Assessment
                </Button>
              </nav>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Resume Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Total Resumes</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Resume Versions</span>
                  <span className="font-medium">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Job-Specific</span>
                  <span className="font-medium">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Last Updated</span>
                  <span className="font-medium">2 days ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="manage">Manage</TabsTrigger>
              <TabsTrigger value="job-match">Job Match</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manage" className="mt-6">
              <ResumeManager />
            </TabsContent>
            
            <TabsContent value="job-match" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resume Job Matching</CardTitle>
                  <CardDescription>
                    Match your resumes to job postings and get optimization recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">Job Matching Coming Soon</h3>
                    <p className="mt-1">
                      This feature will analyze your resumes against job postings and suggest customizations.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resume Analytics</CardTitle>
                  <CardDescription>
                    Insights about your resume performance and optimization opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <LineChart className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">Analytics Coming Soon</h3>
                    <p className="mt-1">
                      Get data-driven insights about your resume and track its performance.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="skills" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Skills Assessment</CardTitle>
                  <CardDescription>
                    Analyze and manage your skills profile based on your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="text-lg font-medium text-gray-900">Skills Assessment Coming Soon</h3>
                    <p className="mt-1">
                      This feature will extract and analyze the skills in your resume.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
