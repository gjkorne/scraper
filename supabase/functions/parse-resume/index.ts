import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "../_shared/cors.ts";

interface ParseResumeRequest {
  resumeId: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { resumeId } = await req.json() as ParseResumeRequest;

    if (!resumeId) {
      throw new Error("Resume ID is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get resume details
    const { data: resume, error: resumeError } = await supabase
      .from("resumes")
      .select("*")
      .eq("id", resumeId)
      .single();

    if (resumeError || !resume) {
      throw new Error(`Resume not found: ${resumeError?.message || "Not found"}`);
    }

    // Download the resume file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("resumes")
      .download(resume.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Error downloading resume: ${downloadError?.message || "Download failed"}`);
    }

    // Extract text based on file type
    let rawText = "";

    if (resume.file_type === "application/pdf") {
      // For PDF files in Deno, we'll use a simple text extraction for now
      // In production, you'd use a more robust PDF parsing library
      const pdfText = await extractTextFromPDF(fileData);
      rawText = pdfText;
    } else if (resume.file_type.includes("word")) {
      // For Word documents
      const docText = await extractTextFromWord(fileData);
      rawText = docText;
    } else {
      // For plain text files
      rawText = await fileData.text();
    }

    // Parse the text to extract structured resume data
    const parsedData = await parseResumeText(rawText);

    // Create a new resume version
    const { data: versionData, error: versionError } = await supabase
      .from("resume_versions")
      .insert({
        resume_id: resumeId,
        content: parsedData,
        raw_text: rawText,
        is_current: true
      })
      .select()
      .single();

    if (versionError) {
      throw new Error(`Error creating resume version: ${versionError.message}`);
    }

    // Store individual sections
    const sections = [
      { type: "contact", content: parsedData.contact, order: 0 },
      { type: "summary", content: parsedData.summary, order: 1 },
      { type: "experience", content: parsedData.experience, order: 2 },
      { type: "education", content: parsedData.education, order: 3 },
      { type: "skills", content: parsedData.skills, order: 4 },
      { type: "certifications", content: parsedData.certifications, order: 5 }
    ];

    for (const section of sections) {
      if (section.content) {
        await supabase.from("resume_sections").insert({
          resume_version_id: versionData.id,
          section_type: section.type,
          content: section.content,
          order_index: section.order
        });
      }
    }

    return new Response(
      JSON.stringify({
        id: versionData.id,
        message: "Resume parsed successfully",
        parsed_data: parsedData
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Error parsing resume:", error);

    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred while parsing the resume"
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  }
});

// Function to extract text from PDF files
async function extractTextFromPDF(pdfFile: Blob): Promise<string> {
  // This is a simplified version. In production, use a proper PDF library
  // For now, we'll just convert to text
  try {
    // Basic binary to text conversion (not ideal for PDFs, just a placeholder)
    const buffer = await pdfFile.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    
    // Filter out binary/non-text content and normalize whitespace
    const extractedText = text
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")  // Keep only printable ASCII
      .replace(/\s+/g, " ")                 // Normalize whitespace
      .trim();
    
    return extractedText;
  } catch (e) {
    console.error("PDF extraction error:", e);
    return "Error extracting text from PDF";
  }
}

// Function to extract text from Word documents
async function extractTextFromWord(wordFile: Blob): Promise<string> {
  // This is a simplified version. In production, use a proper DOCX parser
  try {
    // Basic extraction (placeholder)
    const buffer = await wordFile.arrayBuffer();
    const text = new TextDecoder().decode(buffer);
    
    // Try to extract readable text
    const extractedText = text
      .replace(/[^\x20-\x7E\n\r\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    return extractedText;
  } catch (e) {
    console.error("Word extraction error:", e);
    return "Error extracting text from Word document";
  }
}

// Function to parse resume text into structured data
async function parseResumeText(text: string): Promise<any> {
  // This is a simplified parser. In production, you would use NLP/ML techniques
  
  // Detect sections using heuristics
  const sections = {
    contact: extractContactInfo(text),
    summary: extractSummary(text),
    experience: extractExperience(text),
    education: extractEducation(text),
    skills: extractSkills(text),
    certifications: extractCertifications(text)
  };

  return {
    metadata: {
      parsed_date: new Date().toISOString(),
      confidence_score: 0.75 // Placeholder
    },
    ...sections
  };
}

// Helper functions to extract different sections of the resume
function extractContactInfo(text: string) {
  // Simple regex-based extraction (placeholder implementation)
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = text.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const linkedinMatch = text.match(/linkedin\.com\/in\/[\w-]+/);

  return {
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null,
    linkedin: linkedinMatch ? linkedinMatch[0] : null
  };
}

function extractSummary(text: string) {
  // Look for common summary section headers
  const summaryRegex = /(?:(?:professional\s+)?summary|profile|objective|about\s+me)\s*:?\s*([\s\S]{10,500}?)(?:\n\n|\r\n\r\n|$)/i;
  const match = text.match(summaryRegex);
  
  return match ? { text: match[1].trim() } : null;
}

function extractExperience(text: string) {
  // Very simplified experience extraction (placeholder)
  const experienceRegex = /(?:experience|work\s+experience|employment)\s*:?\s*([\s\S]+?)(?:education|skills|$)/i;
  const match = text.match(experienceRegex);
  
  if (!match) return null;
  
  // Attempt to split into individual roles (simplified)
  const experienceText = match[1];
  const roles = experienceText.split(/\n{2,}/);
  
  return {
    items: roles.map(role => ({
      position: "Unknown Position", // Would need more sophisticated parsing
      company: "Unknown Company",
      duration: "Unknown Duration",
      description: role.trim()
    }))
  };
}

function extractEducation(text: string) {
  // Simplified education extraction (placeholder)
  const educationRegex = /(?:education|academic)\s*:?\s*([\s\S]+?)(?:experience|skills|$)/i;
  const match = text.match(educationRegex);
  
  if (!match) return null;
  
  // Attempt to split into individual education items
  const educationText = match[1];
  const items = educationText.split(/\n{2,}/);
  
  return {
    items: items.map(item => ({
      institution: "Unknown Institution", // Would need more sophisticated parsing
      degree: "Unknown Degree",
      years: "Unknown Years",
      description: item.trim()
    }))
  };
}

function extractSkills(text: string) {
  // Extract skills section
  const skillsRegex = /(?:skills|technical\s+skills|core\s+competencies)\s*:?\s*([\s\S]+?)(?:experience|education|certifications|$)/i;
  const match = text.match(skillsRegex);
  
  if (!match) {
    // Fall back to keyword extraction
    return extractKeywordSkills(text);
  }
  
  const skillsText = match[1];
  // Split by common separators
  const skills = skillsText
    .split(/[,|•\n]+/)
    .map(skill => skill.trim())
    .filter(skill => skill.length > 0 && skill.length < 50); // Filter out items that are too long to be skills
  
  return { list: skills };
}

function extractKeywordSkills(text: string) {
  // A list of common technical skills to look for
  const commonSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C#", "C++", "Go", "Ruby",
    "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask",
    "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "Oracle", "Redis",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "CI/CD", "Git",
    "HTML", "CSS", "SASS", "REST API", "GraphQL", "Microservices",
    "Agile", "Scrum", "DevOps", "TDD", "Project Management"
  ];
  
  const skills = commonSkills.filter(skill => 
    new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)
  );
  
  return { list: skills };
}

function extractCertifications(text: string) {
  // Extract certifications section
  const certRegex = /(?:certifications|certificates|licenses)\s*:?\s*([\s\S]+?)(?:experience|education|skills|$)/i;
  const match = text.match(certRegex);
  
  if (!match) return null;
  
  const certText = match[1];
  // Split by common separators
  const certifications = certText
    .split(/[,|•\n]+/)
    .map(cert => cert.trim())
    .filter(cert => cert.length > 0);
  
  return { list: certifications };
}
