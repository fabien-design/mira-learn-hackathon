export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "validated"
  | "rejected";

export interface ProfessionalExperience {
  role: string;
  company: string;
  start_year: number;
  end_year: number | null;
  description: string;
}

export interface MentorApplication {
  id: string;
  user_id: string;
  status: ApplicationStatus;
  first_name: string;
  last_name: string;
  nomad_since_year: number | null;
  prior_masterclasses_count: number;
  bio: string;
  professional_journey: ProfessionalExperience[];
  transmission_pitch: string;
  motivation: string;
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_admin_id: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type SkillLevel = "intermediate" | "advanced" | "expert";

export interface Skill {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: "business" | "design" | "tech" | "soft" | "lifestyle";
  popularity_score: number;
}

export interface ApplicationSkill {
  id: string;
  application_id: string;
  skill_id: string;
  level: SkillLevel;
  self_declared: boolean;
  validated_via_cv_import: boolean;
  created_at: string;
}

export type ClassFormat = "physical" | "virtual" | "both";
export type RythmPattern =
  | "weekly_session"
  | "biweekly_session"
  | "monthly_workshop"
  | "intensive_weekend"
  | "self_paced";
export type MiraClassStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "validated_draft"
  | "enrichment_in_progress"
  | "published"
  | "rejected"
  | "archived";

export interface TargetCity {
  name: string;
  country_code: string;
}

export interface MiraClass {
  id: string;
  application_id: string | null;
  mentor_user_id: string;
  title: string;
  description: string;
  skills_taught: string[];
  total_hours: number;
  total_hours_collective: number;
  total_hours_individual: number;
  format_envisaged: ClassFormat;
  rythm_pattern: RythmPattern | null;
  target_cities: TargetCity[];
  recommended_price_per_hour_collective_cents: number;
  recommended_price_per_hour_individual_cents: number;
  status: MiraClassStatus;
  rejection_reason: string | null;
  ai_assisted: boolean;
  source_suggestion_id: string | null;
  submitted_at: string | null;
  validated_at: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CVImport {
  id: string;
  application_id: string;
  source_type: "pdf" | "linkedin_url" | "manual_paste";
  file_url: string | null;
  source_url: string | null;
  status: "uploaded" | "extracting" | "extracted" | "validated" | "failed";
  error_message: string | null;
  extracted_experiences_raw: ProfessionalExperience[] | null;
  extracted_skills_raw: ExtractedSkill[] | null;
  validated_experiences: ProfessionalExperience[] | null;
  validated_skills: ExtractedSkill[] | null;
  extracted_at: string | null;
  validated_at: string | null;
  llm_model_used: string | null;
  llm_tokens_consumed: number | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedSkill {
  skill_slug: string;
  level: SkillLevel;
  confidence: number;
  evidence: string;
}

export interface ClassSuggestion {
  id: string;
  application_id: string;
  suggested_title: string;
  suggested_description: string;
  suggested_skill_ids: string[];
  suggested_outline: SuggestionOutlineItem[];
  suggested_total_hours: number;
  suggested_format: ClassFormat;
  justification: string;
  skill_demand_score: number;
  skill_offer_gap_score: number;
  status: "proposed" | "adopted" | "rejected" | "modified";
  adopted_into_class_id: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  llm_model_used: string;
  generated_at: string;
  created_at: string;
}

export interface SuggestionOutlineItem {
  position: number;
  title: string;
  estimated_duration_hours: number;
}

export interface ProfileSkill {
  skill_id: string;
  skill_name: string;
  skill_slug: string;
  level: SkillLevel;
  is_primary: boolean;
  display_order: number;
  category: string;
}

export interface MentorProfilePublic {
  id: string;
  slug: string;
  display_name: string;
  headline: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  professional_journey: ProfessionalExperience[];
  linkedin_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  aggregate_rating: number | null;
  rating_count: number;
  classes_given_count: number;
}

export interface MentorProfileDetail extends MentorProfilePublic {
  skills: ProfileSkill[];
}

export interface RevenueSimulationResult {
  gross_revenue_cents: number;
  platform_fee_cents: number;
  mentor_net_cents: number;
  platform_fee_pct: number;
}
