// Type declarations for Deno and Supabase Edge Functions

// Deno standard library
declare module "https://deno.land/std@*/*" {
  export * from "@types/node";
}

// Supabase client
declare module "https://esm.sh/@supabase/supabase-js@*" {
  export * from "@supabase/supabase-js";
}

// Cheerio library
declare module "npm:cheerio@*" {
  export * from "cheerio";
}

// Deno namespace
declare namespace Deno {
  export function env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    toObject(): Record<string, string>;
  };
  
  export interface TestDefinition {
    name: string;
    fn: () => void | Promise<void>;
    ignore?: boolean;
    only?: boolean;
    sanitizeResources?: boolean;
    sanitizeOps?: boolean;
  }
  
  export function test(t: TestDefinition | string, fn?: () => void | Promise<void>): void;
}

// Declare global fetch
declare var fetch: typeof globalThis.fetch;
