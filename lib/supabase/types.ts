export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      compounds: {
        Row: {
          id: number;
          compound: string;
          rir: number;
          cf: string;
          type: string;
          c_count: number;
          h_count: number;
          o_count: number;
          mm_da: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          compound: string;
          rir: number;
          cf: string;
          c_count: number;
          h_count: number;
          o_count: number;
          mm_da: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          compound?: string;
          rir?: number;
          cf?: string;
          c_count?: number;
          h_count?: number;
          o_count?: number;
          mm_da?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      atomic_constants: {
        Row: {
          id: number;
          symbol: string;
          value: number;
        };
        Insert: {
          id?: number;
          symbol: string;
          value: number;
        };
        Update: {
          id?: number;
          symbol?: string;
          value?: number;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Compound = Database["public"]["Tables"]["compounds"]["Row"];
export type CompoundInsert =
  Database["public"]["Tables"]["compounds"]["Insert"];
export type CompoundUpdate =
  Database["public"]["Tables"]["compounds"]["Update"];
export type AtomicConstant =
  Database["public"]["Tables"]["atomic_constants"]["Row"];
