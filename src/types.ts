export interface JobPosting {
  id: string;
  url: string;
  title: string;
  company: string;
  description: string;
  status: 'NEW' | 'APPLIED' | 'INTERVIEWING' | 'REJECTED' | 'ACCEPTED';
  date_added: string;
  date_modified: string;
  notes: string;
  user_id?: string;
}

export interface ScrapedData {
  title: string;
  company: string;
  description: string;
}