# Phase 1 Technical Research

**Last Updated:** April 12, 2025  
**Project:** Job Scraper & Resume Customizer

This document outlines the technical research for Phase 1 of the project, focusing on NLP libraries, resume parsing options, and PDF generation tools.

## 1. NLP Libraries for Keyword Extraction

Selecting the right Natural Language Processing (NLP) library is crucial for accurate keyword extraction from job descriptions and resumes.

### Comparison of NLP Libraries

| Library | Pros | Cons | Best For | Integration Complexity |
|---------|------|------|----------|------------------------|
| **spaCy** | - Industry standard<br>- Fast performance<br>- Excellent entity recognition<br>- Supports TypeScript | - Larger model size<br>- Requires model downloads | - Production-ready applications<br>- Entity extraction<br>- Detailed NLP tasks | Medium |
| **NLTK** | - Comprehensive features<br>- Academic standard<br>- Good documentation | - Slower performance<br>- Not as modern as alternatives<br>- Python-focused | - Text classification<br>- Research applications<br>- Learning NLP | Medium-High |
| **compromise** | - Tiny footprint (< 350kb)<br>- Pure JavaScript<br>- Works in browser | - Less powerful than spaCy<br>- Limited language support | - Client-side NLP<br>- Simple text parsing<br>- Fast implementation | Low |
| **TensorFlow.js** | - Deep learning capabilities<br>- Custom model training | - Complex setup<br>- Resource intensive | - Advanced ML tasks<br>- Custom classifiers | High |
| **Langchain** | - AI-focused<br>- Integrates with LLMs<br>- Composable pipelines | - Newer library<br>- Requires API keys for some features | - Complex reasoning tasks<br>- LLM augmentation | Medium-High |

### Recommendation for Phase 1

**Primary: spaCy with JavaScript/TypeScript bindings**
- Offers the best balance of power and usability
- Can be deployed in Edge Functions through WebAssembly (though with limitations)
- Excellent for identifying technical skills, experience levels, and requirements

**Alternative: compromise.js**
- Significantly smaller footprint
- Pure JavaScript, easier to deploy in Edge Functions
- Sufficient for basic keyword extraction if spaCy is too resource-intensive

### Implementation Strategy

1. **Initial Proof of Concept:**
   ```typescript
   // Using compromise.js for initial implementation
   import nlp from 'compromise';
   
   function extractKeywords(jobDescription: string): string[] {
     const doc = nlp(jobDescription);
     
     // Extract technical terms, skills, and requirements
     const nouns = doc.nouns().out('array');
     const topics = doc.topics().out('array');
     const verbs = doc.verbs().out('array');
     
     // Filter and clean results
     return [...new Set([...nouns, ...topics])].filter(term => {
       // Filter out common words and short terms
       return term.length > 3 && !commonWords.includes(term.toLowerCase());
     });
   }
   ```

2. **Advanced Implementation with spaCy:**
   - Deploy a small spaCy model in Edge Functions or a separate worker
   - Use custom entity recognition for technical skills
   - Implement frequency analysis for skill importance

## 2. Resume Parsing Options

Extracting structured data from various resume formats is a complex task requiring specialized tools.

### Comparison of Resume Parsing Approaches

| Approach | Pros | Cons | Best For | Complexity |
|----------|------|------|----------|------------|
| **Custom Parser with pdf.js** | - Full control<br>- No API costs<br>- Privacy-friendly | - Development intensive<br>- Maintenance burden<br>- Limited format support | - PDF-focused applications<br>- Basic text extraction | High |
| **Affinda API** | - High accuracy<br>- Multiple formats support<br>- Structured data output | - Monthly costs<br>- API dependency<br>- Privacy considerations | - Production resume parsing<br>- Multiple document formats | Low |
| **Sovren API** | - Industry standard<br>- Excellent accuracy<br>- Skills taxonomy | - Higher cost<br>- Complex integration | - Enterprise applications<br>- Detailed parsing needs | Medium |
| **resume-parser (npm)** | - Open source<br>- JavaScript native<br>- No API costs | - Limited accuracy<br>- Sparse maintenance<br>- Basic functionality | - Simple use cases<br>- Development prototypes | Medium |
| **mammoth.js + NLP** | - Open source<br>- Good for DOCX<br>- Customizable | - Limited to DOCX<br>- Requires custom NLP | - DOCX-focused applications<br>- Combined with PDF.js | Medium-High |

### Recommendation for Phase 2

**Primary: Hybrid Approach with Document Conversion Libraries**
- Use `pdf.js` for PDF extraction
- Use `mammoth.js` for DOCX extraction
- Apply custom section recognition with spaCy or compromise.js
- Store both raw and structured data

**Alternative: Affinda API**
- If budget allows, provides higher accuracy with less development effort
- Good fallback for complex documents our custom parser cannot handle

### Implementation Considerations

1. **Document Storage:**
   - Store uploaded files in Supabase Storage
   - Implement secure, user-isolated buckets
   - Generate signed URLs for document access

2. **Section Recognition Strategy:**
   ```typescript
   const sectionPatterns = {
     experience: /(work|professional) experience|employment( history)?/i,
     education: /education|academic|qualifications/i,
     skills: /(technical |core )?skills|technologies|competencies/i,
     projects: /projects|portfolio/i,
     summary: /(professional |career )?summary|profile|objective/i
   };
   
   function identifySections(text: string): Record<string, string> {
     // Split text into potential sections
     const sections: Record<string, string> = {};
     
     // Identify section boundaries
     const lines = text.split('\n');
     let currentSection = 'unclassified';
     
     for (const line of lines) {
       // Check if this line is a section header
       for (const [section, pattern] of Object.entries(sectionPatterns)) {
         if (pattern.test(line)) {
           currentSection = section;
           sections[currentSection] = '';
           break;
         }
       }
       
       // Add line to current section
       if (sections[currentSection]) {
         sections[currentSection] += line + '\n';
       }
     }
     
     return sections;
   }
   ```

## 3. PDF Generation and Modification

Creating customized resumes requires reliable PDF generation capabilities.

### Comparison of PDF Tools

| Tool | Pros | Cons | Best For | Complexity |
|------|------|------|----------|------------|
| **react-pdf** | - React integration<br>- Declarative approach<br>- Modern API | - Learning curve<br>- Performance with complex docs | - React applications<br>- Complete PDF generation | Medium |
| **jsPDF** | - Lightweight<br>- Well-established<br>- Client or server | - More verbose API<br>- Manual positioning | - Simple documents<br>- Charts and diagrams | Medium |
| **pdfmake** | - Document definition objects<br>- Table support<br>- Node.js & browser | - Less React-friendly<br>- Styling limitations | - Complex layouts<br>- Server-side generation | Medium |
| **PDF-LIB** | - Modern PDF manipulation<br>- Can modify existing PDFs<br>- TypeScript support | - Lower-level API<br>- Less layout assistance | - Modifying existing PDFs<br>- Form filling | High |
| **Puppeteer** | - HTML to PDF conversion<br>- Uses Chrome engine<br>- Pixel-perfect | - Heavier resource usage<br>- Server-side only | - Converting HTML designs<br>- Complex layouts | Medium |

### Recommendation for Phase 4

**Primary: react-pdf**
- Integrates well with our React frontend
- Declarative style matches our codebase
- Component-based approach fits resume sections

**Secondary: PDF-LIB**
- For modifying existing user PDFs
- Allows insertion of customized content into templates

### Implementation Strategy

1. **Resume Template System:**
   ```tsx
   // react-pdf component approach
   import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
   
   const styles = StyleSheet.create({
     page: { padding: 30 },
     section: { marginBottom: 10 },
     heading: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
     subheading: { fontSize: 14, fontWeight: 'bold' },
     text: { fontSize: 12, marginBottom: 3 }
   });
   
   const ResumeTemplate = ({ data }) => (
     <Document>
       <Page size="A4" style={styles.page}>
         <View style={styles.section}>
           <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 10 }}>{data.name}</Text>
           <Text>{data.email} | {data.phone} | {data.location}</Text>
         </View>
         
         <View style={styles.section}>
           <Text style={styles.heading}>Summary</Text>
           <Text style={styles.text}>{data.summary}</Text>
         </View>
         
         <View style={styles.section}>
           <Text style={styles.heading}>Experience</Text>
           {data.experience.map(job => (
             <View key={job.company} style={{ marginBottom: 8 }}>
               <Text style={styles.subheading}>{job.title} at {job.company}</Text>
               <Text style={{ fontSize: 10 }}>{job.startDate} - {job.endDate}</Text>
               <Text style={styles.text}>{job.description}</Text>
             </View>
           ))}
         </View>
         
         {/* Additional sections */}
       </Page>
     </Document>
   );
   ```

2. **Configuration Approach:**
   - Store template configurations in the database
   - Allow users to create and customize templates
   - Support different layouts and styling options

## 4. Vector Embeddings for Semantic Matching

For advanced matching between job descriptions and resumes, vector embeddings offer significant advantages.

### Comparison of Vector Database Options

| Option | Pros | Cons | Best For | Complexity |
|--------|------|------|----------|------------|
| **Supabase pgvector** | - Native integration<br>- No additional service<br>- Low latency | - Limited to PostgreSQL capabilities<br>- Less specialized than dedicated services | - Small to medium datasets<br>- Integrated workflows | Low |
| **Pinecone** | - Purpose-built for vectors<br>- High performance<br>- Specialized functions | - Additional service<br>- Cost considerations | - Large-scale applications<br>- Complex similarity search | Medium |
| **Milvus** | - Open source<br>- High performance<br>- Scalable | - Self-hosting complexity<br>- Operational overhead | - Complete control<br>- On-premises needs | High |
| **OpenAI Embeddings API** | - High quality embeddings<br>- Simple API<br>- Regular updates | - API costs<br>- Less control | - Language understanding<br>- Semantic search | Low |

### Recommendation

**Primary: Supabase pgvector with OpenAI embeddings**
- Leverage our existing Supabase infrastructure
- Use OpenAI API to generate high-quality embeddings
- Store vectors directly in the database for querying

```sql
-- Example pgvector implementation
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to existing tables
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create function to find matches
CREATE OR REPLACE FUNCTION match_jobs_to_resume(resume_id UUID, limit_count INT DEFAULT 10)
RETURNS TABLE (job_id UUID, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT j.id, 1 - (r.embedding <=> j.embedding) as similarity
  FROM resumes r, jobs j
  WHERE r.id = resume_id
  ORDER BY similarity DESC
  LIMIT limit_count;
END;
$$;
```

## 5. Estimated Costs and Resources

| Component | Estimated Monthly Cost | Notes |
|-----------|------------------------|-------|
| **Supabase (Pro Plan)** | $25 | Includes database, storage, and Edge Functions |
| **OpenAI API (Embeddings)** | $0.10/100K tokens | Approx. $5-20 depending on volume |
| **PDF Generation** | $0 | Client-side or Edge Function-based |
| **spaCy/NLP Processing** | $0 | Self-hosted in Edge Functions |
| **Resume Parsing (Custom)** | $0 | Development cost only |
| **Resume Parsing (Affinda)** | $49 (100 credits) | Optional premium alternative |

**Development Resources:**
- 40-60 hours for Phase 1 implementation
- Frontend: 1 developer, 20-30 hours
- Backend: 1 developer, 20-30 hours

## 6. Implementation Plan for Phase 1

### Week 1: Foundation
- Set up NLP infrastructure with compromise.js
- Create initial keyword extraction service
- Implement database schema changes

### Week 2: Core Analysis Features
- Develop job description analysis algorithm
- Implement keyword categorization (required vs. preferred skills)
- Create job_analysis table and API endpoints

### Week 3: Enhancements
- Integrate with frontend components
- Add advanced scraper support (Indeed workarounds if possible)
- Implement caching layer for scraped content

### Week 4: Testing & Refinement
- Performance optimization
- Create comprehensive tests
- User experience refinements

## 7. Risks and Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| NLP accuracy limitations | Medium | High | Start with manual review option, continuously improve models |
| Edge Function resource constraints | High | Medium | Optimize code, consider separate workers for heavy processing |
| PDF generation complexity | Medium | Medium | Start with simple templates, incrementally add features |
| Resume parsing challenges | High | High | Support limited formats initially, provide manual editing |
| API costs exceeding budget | Medium | Low | Implement usage caps, optimize token usage |

## 8. Conclusion and Recommendations

Based on our research, we recommend the following approach for Phase 1:

1. **Start Simple:**
   - Begin with compromise.js for basic keyword extraction
   - Focus on high-quality extraction of technical skills
   - Implement a manual review/edit system for results

2. **Incremental Enhancement:**
   - Add spaCy integration once the basic system is working
   - Gradually improve parsing accuracy with custom models
   - Create a feedback loop to improve extraction accuracy

3. **Critical Path:**
   1. Implement database schema changes
   2. Create basic keyword extraction service
   3. Build job analysis API endpoint
   4. Integrate with frontend components
   5. Add visualization of extracted keywords
   6. Implement skill categorization
