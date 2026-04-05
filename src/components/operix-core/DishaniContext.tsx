import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface DishaniMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DishaniContextType {
  isOpen: boolean;
  openDishani: () => void;
  closeDishani: () => void;
  toggleDishani: () => void;
  messages: DishaniMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  currentPage: string;
  setCurrentPage: (page: string) => void;
}

const DishaniContext = createContext<DishaniContextType | null>(null);

// [AI-BACKEND] This system prompt will be sent to the AI gateway edge function
// once Lovable Cloud is enabled. Currently the sendMessage function is a placeholder.
const SYSTEM_PROMPT = `You are Ask Dishani, the AI assistant for the Operix ERP platform (Udyam Kendra Prism Nexus) by 4DSmartOps. You are a complete business AI for Indian manufacturing and enterprise companies.

YOUR FOUR PURPOSES:

1. NAVIGATION — Guide users to any screen, module, or action in Operix. Know every route.

2. TRAINING — Explain how any module works. Teach procurement cycles, payroll processes, quality workflows.

3. SUPPORT — Diagnose problems, explain errors, suggest fixes. Reduce the need for a support ticket.

4. INDIAN BUSINESS INTELLIGENCE — GST, TDS, EPF/ESI, Companies Act, MSME Act, Factories Act, Tally Prime integration.

THE OPERIX PLATFORM — 14 MODULES:

- Command Center (/erp/command-center): Platform admin — Overview, Foundation and Core, Security Console
- Procure360 (/erp/procure-hub): Full procurement — PR to RFQ to PO to GRN to Invoice to Payment. Includes Vendor Portal.
- Inventory Hub (/erp/inventory-hub): Stock control, store ops, bin management, cycle count, ABC analysis
- Qulicheak (/erp/qulicheak): Quality Control and QA — inspections, NCR, sample testing, acceptance limits
- GateFlow (/erp/gateflow): Gate management — inward/outward, gate passes, vehicle tracking, weighbridge
- Production (/erp/production): BOM, production orders, WIP tracking, MRP planning, job cards, routing, capacity
- MaintainPro (/erp/maintainpro): Asset maintenance — work orders, PM schedules, MRO spares, failure codes
- RequestX (/erp/requestx): Internal purchase requests and indent management
- SalesX Hub (/erp/salesx): Sales, CRM, Telecaller, Field Force — pipeline, visits, proforma, geo-tracking
- FineCore (/erp/finecore): Financial operations — bank reconciliation, payables, receivables, treasury
- PeoplePay (/erp/peoplepay): Full HR and Payroll — employees, attendance, leaves, payroll, statutory compliance
- Back Office Pro (/erp/backoffice): Front desk — visitor check-in, room booking, desk reservation
- ServiceDesk (/erp/servicedesk): Support ticketing — SLA, escalations, knowledge base
- InsightX (/erp/insightx): Business analytics — DataViz Pro, ReportGen, Trend Analyzer, Metrics Hub

CURRENT PLATFORM STATUS:

All 14 modules are in design phase and show Coming Soon. They will progressively become available. When a user asks about a coming soon module, be positive and explain what it will do when live.

INDIAN BUSINESS CONTEXT:

- All monetary amounts in Operix are stored as paise integer. Display divides by 100.
- GST: CGST plus SGST intra-state. IGST inter-state. Rates 0%, 5%, 12%, 18%, 28%.
- TDS: 194A interest, 194C contractors, 194H commission, 194I rent, 194J professional fees, 192 salary.
- EPF: Employee 12% basic, Employer 12% split 3.67% EPF and 8.33% EPS. Above 20 employees.
- ESI: Employee 0.75%, Employer 3.25%. Gross salary up to Rs 21,000 per month.
- Financial year India: April 1 to March 31.
- GST returns: GSTR-1 outward supplies, GSTR-3B monthly summary, GSTR-2B auto-drafted inward.
- Tally Prime integration: Bridge Agent on Windows machine syncs Tally data to Operix cloud via 34 data types.

YOUR BEHAVIOUR RULES:

- Be concise and direct. Indian business users are busy people.
- Use clear Indian English. Avoid excessive formality.
- When you do not know something say: I do not have that information yet.
- Never modify data, never write code, never promise unconfirmed features.
- Always be warm but efficient — like a knowledgeable colleague, not a customer service bot.
- Format responses clearly. Short paragraphs. Bullet points for step-by-step guidance.`;

// [AI-BACKEND] Mock response generator — replace with edge function call when Cloud is enabled.
function getMockResponse(userInput: string): string {
  const q = userInput.toLowerCase();
  if (q.includes("gst")) return "GST in Operix supports CGST+SGST (intra-state) and IGST (inter-state) at rates 0%, 5%, 12%, 18%, and 28%. The FineCore module handles GST invoicing and return preparation (GSTR-1, GSTR-3B, GSTR-2B). This module is coming soon.";
  if (q.includes("procurement") || q.includes("pr") || q.includes("purchase")) return "Procurement in Operix follows: Purchase Request → RFQ → Quotation Comparison → Purchase Order → GRN → Invoice Matching → Payment. Head to Procure360 (/erp/procure-hub) once it's live.";
  if (q.includes("module") || q.includes("available")) return "Operix has 14 modules: Command Center, Procure360, Inventory Hub, Qulicheak, GateFlow, Production, MaintainPro, RequestX, SalesX Hub, FineCore, PeoplePay, Back Office Pro, ServiceDesk, and InsightX. All are currently in design phase and will progressively go live.";
  if (q.includes("tds")) return "TDS in Operix covers sections 194A (interest), 194C (contractors), 194H (commission), 194I (rent), 194J (professional fees), and 192 (salary). FineCore will handle TDS computation and return filing.";
  if (q.includes("payroll") || q.includes("salary") || q.includes("epf") || q.includes("esi")) return "PeoplePay handles full HR and Payroll — employee management, attendance, leaves, payroll processing, and statutory compliance (EPF 12%+12%, ESI 0.75%+3.25%). Coming soon.";
  if (q.includes("hello") || q.includes("hi") || q.includes("hey")) return "Hello! I'm Dishani, your AI guide for Operix. Ask me about any module, Indian compliance (GST, TDS, EPF/ESI), or how to navigate the platform.";
  return "I can help you with Operix modules, Indian business compliance (GST, TDS, EPF/ESI), procurement workflows, and platform navigation. What would you like to know?";
}

export function DishaniProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DishaniMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('Operix Core');

  const openDishani = useCallback(() => setIsOpen(true), []);
  const closeDishani = useCallback(() => setIsOpen(false), []);
  const toggleDishani = useCallback(() => setIsOpen(prev => !prev), []);
  const clearMessages = useCallback(() => setMessages([]), []);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: DishaniMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // [AI-BACKEND] Replace with Lovable Cloud edge function when backend is enabled.
      // Target: POST ${SUPABASE_URL}/functions/v1/dishani-chat
      // Headers: { "Content-Type": "application/json", "Authorization": "Bearer <anon-key>" }
      // Body: { messages: history, currentPage }
      //
      // For now, simulate a response client-side.

      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }));

      // Simulated delay to mimic network latency
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));

      const text = getMockResponse(userMsg.content);

      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: text,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: "I am having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentPage]);

  return (
    <DishaniContext.Provider value={{
      isOpen, openDishani, closeDishani, toggleDishani,
      messages, isLoading, sendMessage, clearMessages,
      currentPage, setCurrentPage,
    }}>
      {children}
    </DishaniContext.Provider>
  );
}

export function useDishani() {
  const ctx = useContext(DishaniContext);
  if (!ctx) throw new Error('useDishani must be used within DishaniProvider');
  return ctx;
}
