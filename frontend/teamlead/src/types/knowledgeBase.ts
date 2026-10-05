export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: 'Account & Access' | 'Hardware' | 'Software' | 'Network' | 'Email' | 'Applications' | 'General Help';
  description: string;
  content: string;
  updatedAt: string;
  views: number;
  helpfulCount: number;
}
