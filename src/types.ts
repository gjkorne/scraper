export interface JobPosting {
  id: string;
  url: string;
  title: string;
  company: string;
  description: string;
  status: 'NEW' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED' | 'ACCEPTED';
  dateAdded: string;
  dateModified: string;
  notes: string;
}

export interface ScrapedData {
  title: string;
  company: string;
  description: string;
}