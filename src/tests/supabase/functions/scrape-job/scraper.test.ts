import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';

// Since we can't directly import the edge functions, we'll recreate simplified versions
// of the functions for testing purposes
async function scrapeLinkedIn(_url: string, fetchResponse: string) {
  const $ = load(fetchResponse);

  const title = $('.top-card-layout__title').text().trim() || 
                $('h1').first().text().trim() ||
                $('.job-details-jobs-unified-top-card__job-title').text().trim();
                
  const company = $('.top-card-layout__company-name').text().trim() ||
                 $('.job-details-jobs-unified-top-card__company-name').text().trim() ||
                 $('.company-name').text().trim();
                 
  const description = $('.description__text').text().trim() ||
                     $('.job-details-jobs-unified-top-card__description-text').text().trim() ||
                     $('.job-description').text().trim();

  if (!title || !company || !description) {
    throw new Error('LinkedIn: Could not find all required job details');
  }

  return { title, company, description };
}

async function scrapeGreenhouse(_url: string, fetchResponse: string) {
  const $ = load(fetchResponse);

  const title = $('.app-title').text().trim() ||
                $('h1.job-title').text().trim() ||
                $('h1:first').text().trim();

  const company = $('.company-name').text().trim() ||
                 $('.employer-info h2').text().trim() ||
                 $('meta[property="og:site_name"]').attr('content')?.trim();

  const description = $('#content').text().trim() ||
                     $('.job-description').text().trim() ||
                     $('#job_description').text().trim();

  if (!title || !company || !description) {
    throw new Error('Greenhouse: Could not find all required job details');
  }

  return { title, company, description };
}

describe('Job Scrapers', () => {
  describe('LinkedIn Scraper', () => {
    it('should extract job details from a LinkedIn posting', async () => {
      // Mock HTML for a LinkedIn job posting
      const mockHtml = `
        <html>
          <body>
            <h1 class="top-card-layout__title">Senior Software Engineer</h1>
            <div class="top-card-layout__company-name">Acme Inc.</div>
            <div class="description__text">
              We're looking for a senior software engineer with 5+ years of experience.
              Required skills: JavaScript, TypeScript, React.
            </div>
          </body>
        </html>
      `;

      const result = await scrapeLinkedIn('https://www.linkedin.com/jobs/view/123456', mockHtml);
      
      expect(result).toEqual({
        title: 'Senior Software Engineer',
        company: 'Acme Inc.',
        description: "We're looking for a senior software engineer with 5+ years of experience. Required skills: JavaScript, TypeScript, React."
      });
    });

    it('should handle alternative LinkedIn HTML structures', async () => {
      // Mock alternative HTML structure
      const mockHtml = `
        <html>
          <body>
            <h1>Frontend Developer</h1>
            <div class="company-name">TechCorp</div>
            <div class="job-description">
              Frontend developer position with 3+ years experience.
              Skills: HTML, CSS, JavaScript.
            </div>
          </body>
        </html>
      `;

      const result = await scrapeLinkedIn('https://www.linkedin.com/jobs/view/789012', mockHtml);
      
      expect(result).toEqual({
        title: 'Frontend Developer',
        company: 'TechCorp',
        description: "Frontend developer position with 3+ years experience. Skills: HTML, CSS, JavaScript."
      });
    });

    it('should throw an error when required fields are missing', async () => {
      // Mock HTML with missing fields
      const mockHtml = `
        <html>
          <body>
            <h1 class="top-card-layout__title">Data Scientist</h1>
            <!-- Company name is missing -->
            <div class="description__text">ML engineer position</div>
          </body>
        </html>
      `;

      await expect(
        scrapeLinkedIn('https://www.linkedin.com/jobs/view/345678', mockHtml)
      ).rejects.toThrow('LinkedIn: Could not find all required job details');
    });
  });

  describe('Greenhouse Scraper', () => {
    it('should extract job details from a Greenhouse posting', async () => {
      // Mock HTML for a Greenhouse job posting
      const mockHtml = `
        <html>
          <body>
            <h1 class="app-title">DevOps Engineer</h1>
            <div class="company-name">Cloud Solutions Inc.</div>
            <div id="content">
              DevOps engineer to manage our cloud infrastructure.
              Required: AWS, Kubernetes, Terraform.
            </div>
          </body>
        </html>
      `;

      const result = await scrapeGreenhouse('https://boards.greenhouse.io/cloudsolutions/jobs/123456', mockHtml);
      
      expect(result).toEqual({
        title: 'DevOps Engineer',
        company: 'Cloud Solutions Inc.',
        description: "DevOps engineer to manage our cloud infrastructure. Required: AWS, Kubernetes, Terraform."
      });
    });
  });
});
