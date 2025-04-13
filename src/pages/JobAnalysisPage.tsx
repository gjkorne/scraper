import { useState } from 'react';
import { JobDashboard } from '../components/JobDashboard';

export function JobAnalysisPage() {
  // In a real application, this would be fetched from a database
  const [job] = useState({
    id: 'job-123',
    title: 'Senior Software Engineer',
    company: 'Acme Technologies',
    description: `
    About Us:
    Acme Technologies is a leading innovator in cloud-based solutions. We're looking for a talented Senior Software Engineer to join our team.

    Responsibilities:
    - Design and implement scalable backend services using Node.js and TypeScript
    - Work with frontend engineers to integrate APIs and optimize performance
    - Participate in code reviews and mentor junior developers
    - Contribute to architecture decisions and technical planning

    Requirements:
    - 5+ years of professional software development experience
    - Strong knowledge of JavaScript/TypeScript and Node.js
    - Experience with React and modern frontend development
    - Familiarity with cloud platforms (AWS, Azure, or GCP)
    - Understanding of CI/CD pipelines and automated testing
    - Experience with SQL and NoSQL databases
    - Strong communication and collaboration skills

    Nice-to-have:
    - Experience with GraphQL
    - Knowledge of containerization (Docker, Kubernetes)
    - Open-source contributions
    - Experience with microservices architecture

    Benefits:
    - Competitive salary and equity package
    - Flexible remote work options
    - Health, dental, and vision insurance
    - 401(k) matching
    - Continuous learning budget
    - Regular team events and retreats
    `
  });

  return (
    <div className="container mx-auto py-3 px-2">
      <h1 className="text-1xl font-bold mb-3">Job Analysis Dashboard</h1>
      
      <p className="text-gray-600 mb-3">
        This dashboard provides analysis and visualization tools to help you understand job requirements and match them to your skills.
      </p>
      
      <JobDashboard
        jobId={job.id}
        jobTitle={job.title}
        jobDescription={job.description}
        companyName={job.company}
        resumeId="resume-456" // Example resume ID
      />
      
      <div className="mt-8 p-4 bg-gray-50 rounded-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-2">How to Use This Dashboard</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>Analysis Tab:</strong> View the AI-powered breakdown of the job description, including required skills, preferred skills, and other key details.
          </li>
          <li>
            <strong>Visualizations Tab:</strong> Explore visual representations of keyword distribution, skill matchmaking with your resume, and keyword relationships.
          </li>
          <li>
            <strong>Resume Match:</strong> See how your current resume matches the job requirements and get suggestions for improvements.
          </li>
          <li>
            <strong>Export or Save:</strong> Export the analysis or save key insights to your resume customization profile.
          </li>
        </ol>
      </div>
    </div>
  );
}
