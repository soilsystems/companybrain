import { BarChart3, BriefcaseBusiness, FileText } from "lucide-react";

export const workspace = {
  organization: "Soil Systems",
  business: "Dubai Fruits Trading",
  role: "Admin",
  user: "Foundation User",
};

export const businesses = [
  {
    id: "dubai-fruits-trading",
    name: "Dubai Fruits Trading",
    organization: "Soil Systems",
    domains: ["Market Intelligence", "Business Deals", "Business Knowledge"],
  },
  {
    id: "real-estate-division",
    name: "Real Estate Division",
    organization: "Soil Systems",
    domains: ["Business Deals", "Business Knowledge"],
  },
  {
    id: "logistics-business",
    name: "Logistics Business",
    organization: "Soil Systems",
    domains: ["Business Deals", "Business Knowledge"],
  },
];

export const domains = [
  {
    slug: "market-intelligence",
    name: "Market Intelligence",
    description: "Dubai Fruits & Vegetables",
    status: "Foundation",
    icon: BarChart3,
  },
  {
    slug: "business-deals",
    name: "Business Deals",
    description: "Commitments, risks, timelines",
    status: "Foundation",
    icon: BriefcaseBusiness,
  },
  {
    slug: "business-knowledge",
    name: "Business Knowledge",
    description: "Private uploaded documents",
    status: "Foundation",
    icon: FileText,
  },
];

export const foundationChecks = [
  { label: "Tenant boundary", value: "Ready" },
  { label: "Business scope", value: "Ready" },
  { label: "Domain registry", value: "Seeded" },
  { label: "AI answers", value: "Deferred" },
];
