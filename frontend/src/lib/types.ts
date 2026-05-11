export type LeadStatus = 'Hot' | 'Warm' | 'New' | 'Cold' | 'Qualified';
export type LeadSource = 'WhatsApp' | 'Instagram' | 'Website' | 'Facebook';
export type PropertyType = 'sale' | 'rent' | 'land';
export type PropertyStatus = 'Verified' | 'Pending';
export type PipelineStage = 'New' | 'Qualified' | 'Negotiating' | 'Closed';
export type ConvStatus = 'AI live' | 'Needs you' | 'Closed cold';
export type MessageType = 'in' | 'out' | 'ai';
export type FollowUpStatus = 'Done' | 'Scheduled' | 'AI will send' | 'Overdue' | 'Active';

export interface Lead {
  id: string;
  name: string;
  source: LeadSource;
  interest: string;
  budget: string;
  status: LeadStatus;
  aiScore: number | null;
  added: string;
  addedAt: string;
  lastContactedAt: string | null;
  dueForFollowUp: boolean;
}

export interface Property {
  id: string;
  name: string;
  location: string;
  price: string;
  type: PropertyType;
  status: PropertyStatus;
  emoji: string;
  color: string;
  addedAt: string;
  images?: string[];     // public URLs from Supabase Storage
  videoUrl?: string;     // YouTube link, Vimeo link, or direct video URL
}

export interface Message {
  id: string;
  type: MessageType;
  text: string;
  time: string;
  label?: string;
}

export interface Conversation {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  lastMessage: string;
  time: string;
  source: LeadSource;
  status: ConvStatus;
  unread: boolean;
  leadStatus?: string;
  aiActive: boolean;
  context: string;
  messages?: Message[];
}

export interface PipelineDeal {
  id: string;
  property: string;
  client: string;
  amount: string;
  stage: PipelineStage;
  progress: number;
}

export interface PipelineData {
  deals: PipelineDeal[];
  grouped: Record<PipelineStage, PipelineDeal[]>;
}

export interface FollowUp {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  status: FollowUpStatus;
  completed: boolean;
  section: string;
}

export interface Campaign {
  id: string;
  label: string;
  color: string;
  title: string;
  subtitle: string;
  status: string;
}

export interface AITemplate {
  id: string;
  triggerLabel: string;
  triggerColor: string;
  trigger: string;
  question: string;
  answer: string;
  usedCount: number;
  continueRate: number;
  autoTag: string;
}

export interface ReportData {
  metrics: {
    totalRevenue: string;
    dealsClosedCount: number;
    leadToCloseRate: number;
    aiSaveRate: number;
  };
  revenueByMonth: { month: string; value: number }[];
  conversionBySource: { source: string; rate: number; color: string }[];
  topNeighborhoods: { name: string; deals: number; pct: number }[];
}

export type Screen = 'dashboard' | 'leads' | 'properties' | 'conversations' | 'pipeline' | 'reports' | 'followups' | 'airesponses';
