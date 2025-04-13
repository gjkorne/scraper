import ResumeJobMatcher from '../components/ResumeJobMatcher';

export default function ResumeMatchTest() {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Resume-Job Matching Test</h1>
      
      <div className="max-w-4xl mx-auto">
        <ResumeJobMatcher />
      </div>
    </div>
  );
}
