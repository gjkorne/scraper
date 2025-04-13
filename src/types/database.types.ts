export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          user_id: string
          url: string
          title: string
          company: string
          description: string
          status: string
          date_added: string
          date_modified: string
          notes: string
        }
        Insert: {
          id?: string
          user_id: string
          url: string
          title: string
          company: string
          description: string
          status: string
          date_added?: string
          date_modified?: string
          notes?: string
        }
        Update: {
          id?: string
          user_id?: string
          url?: string
          title?: string
          company?: string
          description?: string
          status?: string
          date_added?: string
          date_modified?: string
          notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      resumes: {
        Row: {
          id: string
          user_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          original_filename: string
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_path: string
          file_type: string
          file_size: number
          original_filename: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_path?: string
          file_type?: string
          file_size?: number
          original_filename?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      resume_versions: {
        Row: {
          id: string
          resume_id: string
          version_number: number
          version_name: string | null
          content: Json
          raw_text: string
          created_at: string
          created_for_job_id: string | null
          notes: string | null
          is_current: boolean
        }
        Insert: {
          id?: string
          resume_id: string
          version_number?: number
          version_name?: string | null
          content: Json
          raw_text: string
          created_at?: string
          created_for_job_id?: string | null
          notes?: string | null
          is_current?: boolean
        }
        Update: {
          id?: string
          resume_id?: string
          version_number?: number
          version_name?: string | null
          content?: Json
          raw_text?: string
          created_at?: string
          created_for_job_id?: string | null
          notes?: string | null
          is_current?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_resume_id_fkey"
            columns: ["resume_id"]
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_created_for_job_id_fkey"
            columns: ["created_for_job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
      resume_sections: {
        Row: {
          id: string
          resume_version_id: string
          section_type: string
          content: Json
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          resume_version_id: string
          section_type: string
          content: Json
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          resume_version_id?: string
          section_type?: string
          content?: Json
          order_index?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_sections_resume_version_id_fkey"
            columns: ["resume_version_id"]
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          }
        ]
      }
      resume_templates: {
        Row: {
          id: string
          user_id: string | null
          name: string
          description: string | null
          content: Json
          is_system: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          description?: string | null
          content: Json
          is_system?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          description?: string | null
          content?: Json
          is_system?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_templates_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      resume_job_matches: {
        Row: {
          id: string
          resume_id: string
          job_id: string
          match_score: number
          match_details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          resume_id: string
          job_id: string
          match_score: number
          match_details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          resume_id?: string
          job_id?: string
          match_score?: number
          match_details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_job_matches_resume_id_fkey"
            columns: ["resume_id"]
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_job_matches_job_id_fkey"
            columns: ["job_id"]
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
