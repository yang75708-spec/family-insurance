"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { defaultInput } from "@/lib/calculator/defaultInput";
import { calculate } from "@/lib/calculator/formulaEngine";
import type { UserInput, InsuranceResult } from "@/lib/calculator/types";

// ─── Color System: Sage & Warm ───
const C = {
  sage: "#A8B5A2", sageDark: "#6F8072", sageLight: "#E7ECE8",
  warm: "#D8CBB8", warmLight: "#F3F0E9",
  text: "#2F3430", textSec: "#66706A", textTer: "#8B948E",
  teal: "#0d9488", blue: "#3b82f6", emerald: "#10b981",
  amber: "#f59e0b", rose: "#f43f5e", purple: "#a855f7",
};
const CC = [C.blue, C.emerald, C.amber, C.rose];

// ─── Helpers ───
function setN(obj: UserInput, k: string, v: unknown) { const c = { ...obj } as Record<string, unknown>; c[k] = v; return c as unknown as UserInput; }
function cn(...a: (string | boolean | undefined | null)[]) { return a.filter(Boolean).join(" "); }

// ─── Icons ───
const I = {
  user: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>`,
  wallet: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
  heart: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>`,
  bolt: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"/>`,
  clock: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
  shield: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>`,
  home: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>`,
  baby: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/>`,
  bank: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 2l9 4.5v2.25H3V6.5L12 2zm-9 8.25h18v2.25H3v-2.25zm2.25 4.5h13.5V21h-13.5v-6.75z"/>`,
  chart: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>`,
};

const PAGE_ICONS = [I.user, I.wallet, I.heart, I.bolt, I.clock];

// ─── Budget Preset Mappings ───
const BUDGET_CI: Record<string, number> = { "1万以下": 0.5, "1-3万": 2, "3-5万": 4, "5-10万": 7.5, "10万以上": 12 };
const BUDGET_MI: Record<string, number> = { "0.5万以下": 0.25, "0.5-1万": 0.75, "1-3万": 2, "3-5万": 4, "5万以上": 6 };

const HI_TYPES = ["社保医保", "惠民保", "百万医疗", "中端医疗", "高端医疗", "重疾险"] as const;
const HI_COLORS = ["#8FA089", "#A8B5A2", "#6F8072", "#C4B59E", "#D8CBB8", "#465549"];
const MEMBERS = [
  { key: "p1", label: "第一支柱" },
  { key: "p2", label: "第二支柱" },
  { key: "child", label: "子女" },
  { key: "parent", label: "父母" },
] as const;

// ─── Options ───
const O: Record<string, string[]> = {
  firstPersonIncome: ["15万以下", "15-30万", "30-60万", "60-100万", "100万以上"],
  secondPersonIncome: ["15万以下", "15-30万", "30-60万", "60-100万", "100万以上"],
  incomeStability: ["非常稳定（例如：公务员/国企/事业单位）", "较稳定（例如：大型企业核心岗）", "一般（例如：中小企/绩效占比高）", "不稳定（例如：自由职业/创业/销售）"],
  incomeStability2: ["非常稳定（例如：公务员/国企/事业单位）", "较稳定（例如：大型企业核心岗）", "一般（例如：中小企/绩效占比高）", "不稳定（例如：自由职业/创业/销售）"],
  mortgageBalance: ["大于等于100万", "大于等于50万小于100万", "无房贷"],
  otherLoanAmount: ["20万以内", "10-20万", "20-50万", "50万以上", "无其他贷款"],
  bankDeposit: ["5万以下", "5-20万", "20-50万", "50-100万", "100万以上"],
  lowRiskInvestment: ["无", "5万以内", "5-20万", "20-50万", "50万以上"],
  annualExpense: ["5万以下", "5-10万", "10-20万", "20-50万", "50万以上"],
  city: ["北上广深", "二线城市", "普通地级市", "县城"],
  ciBudget: ["1万以下", "1-3万", "3-5万", "5-10万", "10万以上"],
  miBudget: ["0.5万以下", "0.5-1万", "1-3万", "3-5万", "5万以上"],
  childParentLifeIns: ["都不需要", "仅子女", "仅父母", "都需要"],
  firstPersonLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  secondPersonLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  childLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  parentLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  firstPersonLifeTerm: ["63岁", "65岁", "终身", "房贷还清或子女成年"],
  secondPersonLifeTerm: ["63岁", "65岁", "终身", "房贷还清或子女成年"],
  firstPersonGender: ["男性", "女性"],
  secondPersonGender: ["男性", "女性"],
  firstPersonHealthStatus: ["健康", "吸烟", "有病史"],
  secondPersonHealthStatus: ["健康", "吸烟", "有病史"],
  firstPersonExistingLifeYears: ["10年以下", "10-20年", "20年以上", "不清楚"],
  secondPersonExistingLifeYears: ["10年以下", "10-20年", "20年以上", "不清楚"],
  firstPersonRetireAge: ["55-59岁", "60-64岁", "65-69岁", "70岁以上"],
  secondPersonRetireAge: ["55-59岁", "60-64岁", "65-69岁", "70岁以上"],
  firstPersonRetireYears: ["10年以下", "10-19年", "20-29年", "30年以上"],
  secondPersonRetireYears: ["10年以下", "10-19年", "20-29年", "30年以上"],
  firstPersonRetireGoal: ["5万以下", "5-10万", "10-20万", "20-30万", "30万以上"],
  secondPersonRetireGoal: ["5万以下", "5-10万", "10-20万", "20-30万", "30万以上"],
  firstPersonPensionFund: ["无", "5万以下", "5-20万", "20-50万", "50万以上"],
  secondPersonPensionFund: ["无", "5万以下", "5-20万", "20-50万", "50万以上"],
  firstPersonComPension: ["无", "5万以下", "5-20万", "20-50万", "50万以上"],
  secondPersonComPension: ["无", "5万以下", "5-20万", "20-50万", "50万以上"],
  firstPersonPersonalPension: ["无", "5万以下", "5-20万", "20-50万", "50万以上"],
  secondPersonPersonalPension: ["无", "5万以下", "5-20万", "20-50万", "50万以上"],
  firstPersonSocialPension: ["0.2万以下", "0.2-0.5万", "0.5-1万", "1万以上"],
  secondPersonSocialPension: ["0.2万以下", "0.2-0.5万", "0.5-1万", "1万以上"],
  firstPersonPayYears: ["10年", "15年", "20年", "30年"],
  secondPersonPayYears: ["10年", "15年", "20年", "30年"],
  firstPersonPensionBudget: ["1万以下", "1-3万", "3-5万", "5-10万", "10万以上"],
  secondPersonPensionBudget: ["1万以下", "1-3万", "3-5万", "5-10万", "10万以上"],
};

// ─── Pages Config ───
interface Q { key: string; label: string; desc?: string; icon: string; type: "select" | "number"; options?: string[]; unit?: string; min?: number; max?: number; step?: number; }
interface PG { title: string; subtitle: string; questions: Q[]; }

const PAGES: PG[] = [
  {
    title: "家庭信息",
    subtitle: "先来了解一下您的家庭基本情况",
    questions: [
      { key: "firstPersonAge", label: "第一经济支柱的年龄是？", desc: "用于计算剩余工作年限和保障期限", icon: I.user, type: "number", unit: "岁", min: 20, max: 70 },
      { key: "secondPersonAge", label: "第二经济支柱的年龄是？", icon: I.user, type: "number", unit: "岁", min: 20, max: 70 },
      { key: "firstPersonIncome", label: "第一经济支柱的年税后收入", desc: "影响重疾险保额和寿险需求测算", icon: I.wallet, type: "select" },
      { key: "secondPersonIncome", label: "第二经济支柱的年税后收入", icon: I.wallet, type: "select" },
      { key: "incomeStability", label: "第一经济支柱的职业稳定性", desc: "影响收入增长预期和风险系数", icon: I.chart, type: "select" },
      { key: "incomeStability2", label: "第二经济支柱的职业稳定性", desc: "影响第二支柱的收入风险系数", icon: I.chart, type: "select" },
      { key: "childCount", label: "有几个子女？", icon: I.baby, type: "number", min: 0, max: 10 },
      { key: "parentSupportCount", label: "需要赡养几位老人？", icon: I.home, type: "number", min: 0, max: 6 },
      { key: "childAge", label: "最小子女的年龄是？", desc: "用于计算教育期保障年限", icon: I.baby, type: "number", unit: "岁", min: 0, max: 22 },
    ],
  },
  {
    title: "财务状况",
    subtitle: "了解一下您的资产负债情况",
    questions: [
      { key: "mortgageBalance", label: "目前的房贷余额是多少？", desc: "房贷是家庭负债的主要组成部分", icon: I.home, type: "select" },
      { key: "otherLoanAmount", label: "其他贷款合计金额？", desc: "包括车贷、消费贷等", icon: I.bank, type: "select" },
      { key: "bankDeposit", label: "银行存款（活期+定期）", desc: "作为家庭应急储备金", icon: I.bank, type: "select" },
      { key: "lowRiskInvestment", label: "低风险理财金额", desc: "包括货币基金、国债等稳健投资", icon: I.chart, type: "select" },
      { key: "annualExpense", label: "家庭年度刚性开销", desc: "衣食住行等年度必要支出", icon: I.wallet, type: "select" },
      { key: "city", label: "家庭居住在哪个城市？", desc: "影响医疗成本和生活水平基准", icon: I.home, type: "select" },
    ],
  },
  {
    title: "健康险配置",
    subtitle: "勾选家庭成员已有的健康险，勾选后可填写详细信息",
    questions: [ // placeholder — rendered separately
    ],
  },
  {
    title: "寿险配置",
    subtitle: "寿险持有情况与偏好",
    questions: [
      { key: "childParentLifeIns", label: "是否为子女和父母配置寿险？", icon: I.bolt, type: "select" },
      { key: "firstPersonLifeCoverage", label: "第一支柱已有寿险保额", icon: I.shield, type: "select" },
      { key: "secondPersonLifeCoverage", label: "第二支柱已有寿险保额", icon: I.shield, type: "select" },
      { key: "firstPersonLifeTerm", label: "第一支柱偏好的保障期限", icon: I.clock, type: "select" },
      { key: "secondPersonLifeTerm", label: "第二支柱偏好的保障期限", icon: I.clock, type: "select" },
      { key: "firstPersonLifeBudget", label: "第一支柱年度寿险预算", desc: "每年愿意投入寿险的保费", icon: I.wallet, type: "number", unit: "万元", min: 0 },
      { key: "secondPersonLifeBudget", label: "第二支柱年度寿险预算", icon: I.wallet, type: "number", unit: "万元", min: 0 },
    ],
  },
  {
    title: "养老金配置",
    subtitle: "退休规划与现有养老储备",
    questions: [],
  },
];

// ─── Shared Components ───
function StatCard({ label, value, trend }: { label: string; value: string; trend?: "good" | "bad" | "neutral" }) {
  const tc = { good: "text-sage-600", bad: "text-rose-400", neutral: "text-amber-500" };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-card p-6">
      <div className="text-[11px] font-semibold text-text-tertiary tracking-wider uppercase mb-1">{label}</div>
      <div className={cn("text-[26px] font-bold tracking-tight font-display", trend ? tc[trend] : "text-text-primary")}>{value}</div>
    </motion.div>
  );
}

function R({ label, value, trend }: { label: string; value: string; trend?: "good" | "bad" | "neutral" }) {
  const tc = { good: "text-sage-600", bad: "text-rose-400", neutral: "text-amber-500" };
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-sage-100 last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={cn("text-sm font-semibold", trend ? tc[trend] : "text-text-primary")}>{value}</span>
    </div>
  );
}

function PersonTabs({ result, color }: { result: Record<string, unknown>; color: string }) {
  const [tab, setTab] = useState<"health" | "life" | "pension">("health");
  const tabs = [{ k: "health" as const, l: "健康险" }, { k: "life" as const, l: "寿险" }, { k: "pension" as const, l: "养老金" }];
  const panels: Record<string, React.ReactNode> = {
    health: (<><R label="建议重疾险保额" value={`${Number(result.recommendedCICoverage).toFixed(0)} 万元`} /><R label="重疾险缺口" value={`${Number(result.ciGap).toFixed(0)} 万元`} trend={Number(result.ciGap) > 20 ? "bad" : "good"} /><R label="建议医疗险类型" value={String(result.recommendedMIType)} />{String(result.recommendedMIReason) && <div className="text-[10px] text-text-tertiary leading-tight mt-0.5 mb-2 pl-1 border-l-2 border-sage-200/60">{String(result.recommendedMIReason)}</div>}<R label="医疗险缺口" value={`${Number(result.miGap).toFixed(1)} 万元`} trend={Number(result.miGap) > 10 ? "bad" : "good"} /><R label="重疾险年保费" value={`${Number(result.estimatedCIPremium).toFixed(2)} 万元`} /><R label="预算检验" value={String(result.healthBudgetResult)} trend={String(result.healthBudgetResult).includes("✅") ? "good" : "bad"} /></>),
    life: (<><R label="建议寿险保额" value={`${Number(result.recommendedLifeCoverage).toFixed(0)} 万元`} /><R label="寿险缺口" value={`${Number(result.lifeGap).toFixed(0)} 万元`} trend={Number(result.lifeGap) > 50 ? "bad" : "good"} /><R label="预估年保费" value={`${Number(result.estimatedLifePremium).toFixed(2)} 万元`} /><R label="预算检验" value={String(result.lifeBudgetResult)} trend={String(result.lifeBudgetResult).includes("✅") ? "good" : "bad"} /><R label="配置建议" value={String(result.lifeTermSuggestion)} /></>),
    pension: (<><R label="建议年补充养老金" value={`${Number(result.recommendedPensionAnnual).toFixed(0)} 万元`} /><R label="养老金缺口" value={`${Number(result.pensionGap).toFixed(0)} 万元`} trend={Number(result.pensionGap) > 50 ? "bad" : "good"} /><R label="已有储备终值" value={`${Number(result.existingPensionFV).toFixed(0)} 万元`} /><R label="缴费年限" value={`${Number(result.payYears).toFixed(0)} 年`} /><R label="预算检验" value={String(result.pensionBudgetResult)} trend={String(result.pensionBudgetResult).includes("✅") ? "good" : "bad"} /></>),
  };
  return (
    <div>
      <div className="flex gap-1 p-0.5 bg-sage-50/60 rounded-xl mb-4">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-lg transition-all", tab === t.k ? "glass shadow-sm text-text-primary" : "text-text-tertiary hover:text-text-secondary")}>{t.l}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>{panels[tab]}</motion.div>
      </AnimatePresence>
    </div>
  );
}

function QuestionItem({ q, val, onChange, rawVal, onTextChange, onTextBlur, index }: { q: Q; val: unknown; onChange: (k: string, v: unknown) => void; rawVal?: string; onTextChange?: (k: string, raw: string) => void; onTextBlur?: (k: string) => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <div className="glass rounded-card p-6 transition-all duration-300 hover:shadow-[0_10px_30px_rgba(168,181,162,0.08)]">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-sage-50 flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: q.icon }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-text-primary">{q.label}</span>
              {q.desc && <span className="hidden sm:inline text-[11px] text-text-tertiary truncate">— {q.desc}</span>}
            </div>
            {q.desc && <p className="text-[11px] text-text-tertiary mb-3 sm:hidden">{q.desc}</p>}
            {q.type === "select" ? (
              <div className="relative max-w-md">
                <select value={String(val ?? "")} onChange={(e) => onChange(q.key, e.target.value)}
                  className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                  <option value="" disabled>请选择</option>
                  {(O[q.key] || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ) : (
              <div className="relative max-w-xs">
                <input type="text" inputMode="decimal" value={rawVal ?? (val === undefined || val === null ? '' : String(val))} onChange={(e) => { const r = e.target.value; if (/^-?\d*\.?\d*$/.test(r)) onTextChange?.(q.key, r); }}
                  min={q.min} max={q.max} step={q.step}
                  onFocus={(e) => e.target.select()}
                  onBlur={() => onTextBlur?.(q.key)}
                  className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary" />
                {q.unit && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary pointer-events-none font-medium">{q.unit}</span>}
              </div>
            )}
            {q.type === "select" && O[q.key] && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {O[q.key].slice(0, 5).map((opt) => (
                  <button key={opt} onClick={() => onChange(q.key, opt)}
                    className={cn(
                      "text-[10px] px-3 py-1 rounded-full border transition-all",
                      val === opt
                        ? "bg-sage-300/80 text-white border-sage-300"
                        : "bg-white/50 text-text-tertiary border-sage-200/50 hover:border-sage-300 hover:text-sage-600"
                    )}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pension Helpers ───
function PensionNumberItem({ label, desc, unit, value, rawVal, min, max, step, onChange, onTextChange, onTextBlur, textKey }: {
  label: string; desc?: string; unit: string; value: number; rawVal?: string; min?: number; max?: number; step?: number;
  onChange: (v: number) => void; onTextChange?: (k: string, raw: string) => void; onTextBlur?: (k: string) => void; textKey?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">
        {label}
        {desc && <span className="text-text-tertiary/60"> — {desc}</span>}
      </label>
      <div className="relative">
        <input type="text" inputMode="decimal"
          value={rawVal ?? (value === undefined || value === null ? '' : String(value))}
          onChange={(e) => { const r = e.target.value; if (/^-?\d*\.?\d*$/.test(r)) onTextChange?.(textKey ?? '', r); }}
          min={min} max={max} step={step}
          onFocus={(e) => e.target.select()}
          onBlur={() => textKey && onTextBlur?.(textKey)}
          className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary pointer-events-none font-medium">{unit}</span>
      </div>
    </div>
  );
}

function PensionSelect({ label, desc, optionsKey, value, onChange }: { label: string; desc?: string; optionsKey: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">
        {label}
        {desc && <span className="text-text-tertiary/60"> — {desc}</span>}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
        {(O[optionsKey] || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );
}

function PensionToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">{label}</label>
      <div className="flex gap-2">
        <button onClick={() => onChange(true)}
          className={cn("flex-1 text-sm h-10 px-4 rounded-input border transition-all font-medium",
            value ? "bg-sage-300/80 text-white border-sage-300" : "bg-white/60 text-text-tertiary border-sage-200/50 hover:border-sage-300 hover:text-sage-600"
          )}>有</button>
        <button onClick={() => onChange(false)}
          className={cn("flex-1 text-sm h-10 px-4 rounded-input border transition-all font-medium",
            !value ? "bg-sage-300/80 text-white border-sage-300" : "bg-white/60 text-text-tertiary border-sage-200/50 hover:border-sage-300 hover:text-sage-600"
          )}>没有</button>
      </div>
    </div>
  );
}

// ─── Restore Dialog ───
function RestoreDialog({ onRestore, onDismiss }: { onRestore: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl border border-white/40">
        <div className="w-12 h-12 rounded-2xl bg-sage-50 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </div>
        <h3 className="text-lg font-bold text-text-primary font-display mb-2">恢复上次数据？</h3>
        <p className="text-sm text-text-secondary mb-6 leading-relaxed">检测到您之前填写的数据，是否恢复到上次的状态？</p>
        <div className="flex gap-3">
          <button onClick={onRestore}
            className="flex-1 px-4 py-2.5 rounded-button bg-sage-300/80 text-text-primary font-medium text-sm hover:bg-sage-300 transition-all">是，恢复数据</button>
          <button onClick={onDismiss}
            className="flex-1 px-4 py-2.5 rounded-button bg-white/60 text-text-secondary font-medium text-sm border border-sage-200/50 hover:bg-white/80 transition-all">否，重新填写</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Home ───
export default function Home() {
  const [input, setInput] = useState<UserInput>(defaultInput);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(0);
  const [showRestore, setShowRestore] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [savedData, setSavedData] = useState<UserInput | null>(null);
  const [rawValues, setRawValues] = useState<Record<string, string>>({});
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const result = useMemo<InsuranceResult>(() => calculate(input), [input]);
  const handle = useCallback((k: string, v: unknown) => setInput((p) => setN(p, k, v)), []);

  // 处理文本数字输入：保留原始字符串用于显示，延迟解析为数字
  const handleTextInput = useCallback((k: string, raw: string) => {
    setRawValues(p => ({ ...p, [k]: raw }));
    if (raw === '' || raw === '-') {
      setInput(p => setN(p, k, 0));
    } else if (!raw.endsWith('.')) {
      const n = Number(raw);
      if (!isNaN(n)) setInput(p => setN(p, k, n));
    }
    // 如果以 . 结尾，保留原始字符串显示但不更新数字状态
  }, []);

  const goTo = (s: number) => { setDir(s > step ? 1 : -1); setStep(s); };

  const clearRawVal = useCallback((k: string) => {
    setRawValues(p => { const n = { ...p }; delete n[k]; return n; });
  }, []);

  const renderBarTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload || !hoveredBar) return null;
    const item = payload.find((p: any) => p.dataKey === hoveredBar);
    if (!item) return null;
    return (
      <div className="glass rounded-xl px-3 py-2 shadow-md border border-white/50">
        <span className="text-sm font-medium" style={{ color: item.color }}>{item.dataKey}：{item.value.toFixed(1)} 万元</span>
      </div>
    );
  }, [hoveredBar]);


  // 恢复检测：检查 localStorage 是否有保存的数据
  useEffect(() => {
    try {
      const raw = localStorage.getItem('family-insurance-data');
      if (raw) {
        const data = JSON.parse(raw) as UserInput;
        // 简单校验：至少 firstPersonAge 存在且为数字
        if (typeof data.firstPersonAge === 'number') {
          setSavedData(data);
          setShowRestore(true);
        }
      }
    } catch { /* ignore parse errors */ }
  }, []);

  // 自动保存：input 变化后 1.5s 防抖存入 localStorage
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem('family-insurance-data', JSON.stringify(input));
      setSaveStatus('saved');
    }, 1500);
    return () => clearTimeout(timer);
  }, [input]);

  // 用于恢复的临时存储
  const handleRestore = useCallback(() => {
    if (savedData) setInput(savedData);
    setShowRestore(false);
    setSavedData(null);
  }, [savedData]);

  const handleDismissRestore = useCallback(() => {
    localStorage.removeItem('family-insurance-data');
    setShowRestore(false);
    setSavedData(null);
  }, []);

  const gapData = useMemo(() => [
    { name: "第一支柱", 重疾险缺口: result.firstPerson.ciGap, 医疗险缺口: result.firstPerson.miGap, 寿险缺口: result.firstPerson.lifeGap },
    { name: "第二支柱", 重疾险缺口: result.secondPerson.ciGap, 医疗险缺口: result.secondPerson.miGap, 寿险缺口: result.secondPerson.lifeGap },
  ], [result]);

  const pieData = useMemo(() => [
    { name: "重疾险保费", value: Math.round((result.firstPerson.estimatedCIPremium + result.secondPerson.estimatedCIPremium) * 100) / 100 },
    { name: "医疗险保费", value: Math.round((result.firstPerson.estimatedMIPremium + result.secondPerson.estimatedMIPremium) * 100) / 100 },
    { name: "寿险保费", value: Math.round((result.firstPerson.estimatedLifePremium + result.secondPerson.estimatedLifePremium) * 100) / 100 },
    { name: "养老金年缴", value: Math.round((result.firstPerson.recommendedPensionAnnual + result.secondPerson.recommendedPensionAnnual) * 100) / 100 },
  ].filter(i => i.value > 0), [result]);

  const LABELS = ["欢迎", "家庭信息", "财务状况", "健康险", "寿险", "养老金", "结果"];

  return (
    <>
    <div className="h-dvh flex flex-col relative overflow-hidden screen-only">
      {/* 背景氛围光晕 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(168,181,162,0.15) 0%, transparent 70%)', animation: 'softGlow 8s ease-in-out infinite' }} />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(216,203,184,0.12) 0%, transparent 70%)', animation: 'softGlow 10s ease-in-out infinite 2s' }} />
      </div>

      {/* ─── Header ─── */}
      <header className="shrink-0 z-50 glass border-b border-white/30">
        {/* Logo 行 */}
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-sage-300/80 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-text-primary font-display">家庭保险配置</span>
          </div>
        </div>
        {/* Emoji 进度条 */}
        <div className="max-w-4xl mx-auto px-6 pb-3 pt-0.5">
          <div className="flex items-center justify-between">
            {[
              { emoji: "🏠", key: "欢迎" },
              { emoji: "👨‍👩‍👧‍👦", key: "家庭" },
              { emoji: "💰", key: "财务" },
              { emoji: "❤️", key: "健康" },
              { emoji: "🛡️", key: "寿险" },
              { emoji: "🌴", key: "养老" },
              { emoji: "✨", key: "结果" },
            ].map((item, i) => (
              <div key={item.key} className="flex items-center gap-0 flex-1">
                <button onClick={() => i <= step && goTo(i)}
                  className={cn(
                    "text-base sm:text-lg transition-all duration-300 shrink-0",
                    i === step ? "opacity-100 scale-110 drop-shadow-sm" : i < step ? "opacity-80 hover:opacity-100 cursor-pointer" : "opacity-15 cursor-default"
                  )}>{item.emoji}</button>
                {i < LABELS.length - 1 && (
                  <div className={cn("flex-1 h-px mx-1.5 transition-colors duration-300", i < step ? "bg-sage-300/50" : "bg-sage-100")} />
                )}
                </div>
              ))}
            </div>
          </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto w-full px-6 py-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={{
              enter: (d: number) => ({ x: d > 0 ? 320 : -320, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? -320 : 320, opacity: 0 }),
            }} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }} className="w-full">

              {/* ═══ Welcome / Hero (0) ═══ */}
              {step === 0 && (
                <div className="min-h-[80vh] flex items-center">
                  <div className="w-full grid lg:grid-cols-2 gap-16 items-center">
                    {/* 左侧内容 */}
                    <div className="space-y-8">
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sage-50/80 backdrop-blur-md border border-sage-100/50">
                        <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
                        <span className="text-sm text-text-secondary">家庭保障顾问系统</span>
                      </motion.div>
                      <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.7 }} className="text-4xl lg:text-5xl font-display font-medium tracking-tight text-text-primary leading-tight">
                        为家庭建立<br /><span className="text-sage-500">更安心的</span>保障结构
                      </motion.h1>
                      <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.7 }} className="text-base text-text-secondary leading-relaxed max-w-md">
                        基于家庭收入、责任与生命周期，生成更适合你的保障方案。
                      </motion.p>
                      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.7 }} className="flex items-center gap-4 pt-4">
                        <motion.button onClick={() => goTo(1)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="px-10 py-3.5 rounded-button bg-sage-300/80 hover:bg-sage-300 text-text-primary font-medium border border-white/30 transition-all duration-300 hover:shadow-[0_8px_25px_rgba(168,181,162,0.15)] text-base">
                          开始家庭评估
                        </motion.button>
                        <motion.button onClick={() => goTo(6)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          className="px-8 py-3.5 rounded-button bg-transparent hover:bg-white/30 text-text-secondary font-medium border border-white/30 transition-all duration-300 text-base">
                          了解更多 →
                        </motion.button>
                      </motion.div>
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex items-center gap-6 pt-8 text-xs text-text-tertiary">
                        <span className="flex items-center gap-2"><svg className="w-4 h-4 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>隐私安全保护</span>
                        <span className="flex items-center gap-2"><svg className="w-4 h-4 text-sage-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>专业顾问支持</span>
                      </motion.div>
                    </div>

                    {/* 右侧视觉 — 浮动卡片 */}
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative hidden lg:block">
                      <div className="absolute inset-0 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, rgba(168,181,162,0.3) 0%, rgba(216,203,184,0.2) 50%, transparent 70%)' }} />
                      <div className="relative space-y-6">
                        <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="glass rounded-card p-6 border border-white/50 shadow-lg max-w-sm ml-auto">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-sage-50 flex items-center justify-center">
                              <svg className="w-6 h-6 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <div><div className="text-sm font-medium text-text-primary">家庭保障评分</div><div className="text-2xl font-display text-sage-600">87</div></div>
                          </div>
                        </motion.div>
                        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="glass rounded-card p-6 border border-white/50 shadow-lg max-w-sm">
                          <div className="space-y-3">
                            <div className="text-sm text-text-secondary">保障覆盖率</div>
                            <div className="w-full h-2 rounded-full bg-sage-100">
                              <motion.div initial={{ width: 0 }} animate={{ width: '78%' }} transition={{ duration: 2, delay: 0.5 }} className="h-full rounded-full bg-sage-400" />
                            </div>
                            <div className="text-right text-sm text-sage-600 font-medium">78%</div>
                          </div>
                        </motion.div>
                        <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="glass rounded-card p-6 border border-white/50 shadow-lg max-w-sm ml-12">
                          <div className="flex justify-between items-center">
                            <div><div className="text-sm text-text-secondary">推荐年保费</div><div className="text-xl font-display text-text-primary mt-1">¥18,500</div></div>
                            <div className="w-16 h-16 rounded-full border-4 border-sage-200 flex items-center justify-center"><span className="text-sm font-medium text-sage-600">2.4x</span></div>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ═══ Input Pages (1-2) ═══ */}
              {(step === 1 || step === 2) && (
                <div className="max-w-2xl mx-auto">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-sage-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: PAGE_ICONS[step - 1] }} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-text-primary font-display">{PAGES[step - 1].title}</h1>
                      <p className="text-xs text-text-tertiary">{PAGES[step - 1].subtitle}</p>
                    </div>
                  </motion.div>

                  {step === 1 && (
                    <div className="space-y-4">
                      {/* 第一经济支柱 */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0 }} className="glass rounded-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-3.5 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center">
                            <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: I.user }} />
                          </div>
                          第一经济支柱
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">年龄</label>
                            <input type="text" inputMode="decimal" value={rawValues['firstPersonAge'] ?? (input.firstPersonAge === undefined || input.firstPersonAge === null ? '' : String(input.firstPersonAge))}
                              onChange={(e) => { const r = e.target.value; if (/^-?\d*\.?\d*$/.test(r)) handleTextInput('firstPersonAge', r); }}
                              onFocus={(e) => e.target.select()} onBlur={() => clearRawVal('firstPersonAge')}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary" />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">性别</label>
                            <select value={input.firstPersonGender} onChange={(e) => handle('firstPersonGender', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              {O.firstPersonGender.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">年税后收入</label>
                            <select value={input.firstPersonIncome} onChange={(e) => handle('firstPersonIncome', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.firstPersonIncome.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">职业稳定性</label>
                            <select value={input.incomeStability} onChange={(e) => handle('incomeStability', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.incomeStability.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* 健康状况 */}
                        <div className="mt-3.5">
                          <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">健康状况</label>
                          <div className="flex gap-2">
                            {O.firstPersonHealthStatus.map((opt) => (
                              <button key={opt} onClick={() => handle("firstPersonHealthStatus", opt)}
                                className={cn(
                                  "flex-1 text-sm h-9 px-3 rounded-input border transition-all font-medium",
                                  input.firstPersonHealthStatus === opt
                                    ? "bg-sage-300/80 text-white border-sage-300"
                                    : "bg-white/60 text-text-tertiary border-sage-200/50 hover:border-sage-300 hover:text-sage-600"
                                )}>{opt}</button>
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      {/* 第二经济支柱 */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="glass rounded-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-3.5 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center">
                            <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: I.user }} />
                          </div>
                          第二经济支柱
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">年龄</label>
                            <input type="text" inputMode="decimal" value={rawValues['secondPersonAge'] ?? (input.secondPersonAge === undefined || input.secondPersonAge === null ? '' : String(input.secondPersonAge))}
                              onChange={(e) => { const r = e.target.value; if (/^-?\d*\.?\d*$/.test(r)) handleTextInput('secondPersonAge', r); }}
                              onFocus={(e) => e.target.select()} onBlur={() => clearRawVal('secondPersonAge')}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary" />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">性别</label>
                            <select value={input.secondPersonGender} onChange={(e) => handle('secondPersonGender', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              {O.secondPersonGender.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">年税后收入</label>
                            <select value={input.secondPersonIncome} onChange={(e) => handle('secondPersonIncome', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.secondPersonIncome.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">职业稳定性</label>
                            <select value={input.incomeStability2} onChange={(e) => handle('incomeStability2', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.incomeStability2.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>
                        {/* 健康状况 */}
                        <div className="mt-3.5">
                          <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">健康状况</label>
                          <div className="flex gap-2">
                            {O.secondPersonHealthStatus.map((opt) => (
                              <button key={opt} onClick={() => handle("secondPersonHealthStatus", opt)}
                                className={cn(
                                  "flex-1 text-sm h-9 px-3 rounded-input border transition-all font-medium",
                                  input.secondPersonHealthStatus === opt
                                    ? "bg-sage-300/80 text-white border-sage-300"
                                    : "bg-white/60 text-text-tertiary border-sage-200/50 hover:border-sage-300 hover:text-sage-600"
                                )}>{opt}</button>
                            ))}
                          </div>
                        </div>
                      </motion.div>

                      {/* 家庭情况 */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="glass rounded-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-3.5 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center">
                            <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: I.home }} />
                          </div>
                          家庭情况
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3.5">
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">子女数量</label>
                            <input type="text" inputMode="decimal" value={rawValues['childCount'] ?? (input.childCount === undefined || input.childCount === null ? '' : String(input.childCount))}
                              onChange={(e) => { const r = e.target.value; if (/^-?\d*\.?\d*$/.test(r)) handleTextInput('childCount', r); }}
                              onFocus={(e) => e.target.select()} onBlur={() => clearRawVal('childCount')}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary" />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">赡养老人数量</label>
                            <input type="text" inputMode="decimal" value={rawValues['parentSupportCount'] ?? (input.parentSupportCount === undefined || input.parentSupportCount === null ? '' : String(input.parentSupportCount))}
                              onChange={(e) => { const r = e.target.value; if (/^-?\d*\.?\d*$/.test(r)) handleTextInput('parentSupportCount', r); }}
                              onFocus={(e) => e.target.select()} onBlur={() => clearRawVal('parentSupportCount')}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary" />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">最小子女年龄</label>
                            <input type="text" inputMode="decimal" value={rawValues['childAge'] ?? (input.childAge === undefined || input.childAge === null ? '' : String(input.childAge))}
                              onChange={(e) => { const r = e.target.value; if (/^-?\d*\.?\d*$/.test(r)) handleTextInput('childAge', r); }}
                              onFocus={(e) => e.target.select()} onBlur={() => clearRawVal('childAge')}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary" />
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-4">
                      {/* 家庭负债 */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0 }} className="glass rounded-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-3.5 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center">
                            <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: I.bank }} />
                          </div>
                          家庭负债
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">房贷余额</label>
                            <select value={input.mortgageBalance} onChange={(e) => handle('mortgageBalance', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.mortgageBalance.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">其他贷款</label>
                            <select value={input.otherLoanAmount} onChange={(e) => handle('otherLoanAmount', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.otherLoanAmount.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>
                      </motion.div>

                      {/* 资产与开支 */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="glass rounded-card p-5">
                        <h3 className="text-sm font-semibold text-text-primary mb-3.5 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sage-50 flex items-center justify-center">
                            <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: I.wallet }} />
                          </div>
                          资产与开支
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">银行存款</label>
                            <select value={input.bankDeposit} onChange={(e) => handle('bankDeposit', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.bankDeposit.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">低风险理财</label>
                            <select value={input.lowRiskInvestment} onChange={(e) => handle('lowRiskInvestment', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.lowRiskInvestment.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">年度刚性开销</label>
                            <select value={input.annualExpense} onChange={(e) => handle('annualExpense', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.annualExpense.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-text-tertiary mb-1 block">居住城市</label>
                            <select value={input.city} onChange={(e) => handle('city', e.target.value)}
                              className="w-full text-sm h-9 px-3.5 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-8">
                              <option value="" disabled>请选择</option>
                              {O.city.map((o) => <option key={o} value={o}>{o}</option>)}
                            </select>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ Pension Page (step 5) ═══ */}
              {step === 5 && (
                <div className="max-w-2xl mx-auto">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-sage-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: PAGE_ICONS[4] }} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-text-primary font-display">养老金配置</h1>
                      <p className="text-xs text-text-tertiary">退休规划与现有养老储备</p>
                    </div>
                  </motion.div>

                  <div className="space-y-6">
                    {/* 第一经济支柱 */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-sage-300/80 flex items-center justify-center text-white text-[10px] font-bold">1</span>
                        第一经济支柱
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <PensionSelect label="计划退休年龄" desc="越早退休需要储备越多养老金" optionsKey="firstPersonRetireAge" value={input.firstPersonRetireAge} onChange={(v) => handle("firstPersonRetireAge", v)} />
                        <PensionSelect label="退休后生活年限" desc="预计退休后需要维持生活质量的年数" optionsKey="firstPersonRetireYears" value={input.firstPersonRetireYears} onChange={(v) => handle("firstPersonRetireYears", v)} />
                        <PensionSelect label="退休后年生活目标" desc="退休后每年需要的生活费用" optionsKey="firstPersonRetireGoal" value={input.firstPersonRetireGoal} onChange={(v) => handle("firstPersonRetireGoal", v)} />
                        <PensionToggle label="是否已有养老资金" value={input.firstPersonHasPension} onChange={(v) => handle("firstPersonHasPension", v)} />
                      </div>
                      {input.firstPersonHasPension && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-sage-100">
                          <PensionSelect label="养老专项存款" desc="已预留的养老资金" optionsKey="firstPersonPensionFund" value={input.firstPersonPensionFund} onChange={(v) => handle("firstPersonPensionFund", v)} />
                          <PensionSelect label="商业养老金价值" optionsKey="firstPersonComPension" value={input.firstPersonComPension} onChange={(v) => handle("firstPersonComPension", v)} />
                        </motion.div>
                      )}
                    </motion.div>

                    {/* 第二经济支柱 */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-sage-300/80 flex items-center justify-center text-white text-[10px] font-bold">2</span>
                        第二经济支柱
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <PensionSelect label="计划退休年龄" optionsKey="secondPersonRetireAge" value={input.secondPersonRetireAge} onChange={(v) => handle("secondPersonRetireAge", v)} />
                        <PensionSelect label="退休后生活年限" optionsKey="secondPersonRetireYears" value={input.secondPersonRetireYears} onChange={(v) => handle("secondPersonRetireYears", v)} />
                        <PensionSelect label="退休后年生活目标" optionsKey="secondPersonRetireGoal" value={input.secondPersonRetireGoal} onChange={(v) => handle("secondPersonRetireGoal", v)} />
                        <PensionToggle label="是否已有养老资金" value={input.secondPersonHasPension} onChange={(v) => handle("secondPersonHasPension", v)} />
                      </div>
                      {input.secondPersonHasPension && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-sage-100">
                          <PensionSelect label="养老专项存款" desc="已预留的养老资金" optionsKey="secondPersonPensionFund" value={input.secondPersonPensionFund} onChange={(v) => handle("secondPersonPensionFund", v)} />
                          <PensionSelect label="商业养老金价值" optionsKey="secondPersonComPension" value={input.secondPersonComPension} onChange={(v) => handle("secondPersonComPension", v)} />
                        </motion.div>
                      )}
                    </motion.div>

                    {/* 通用设置 */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-sage-100 flex items-center justify-center text-text-tertiary text-[10px] font-bold">⚙</span>
                        其他养老金设置
                      </h3>
                      <p className="text-[11px] text-text-tertiary mb-4">社保养老金和个人养老金账户会纳入已有储备计算</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <PensionSelect label="第一支柱个人养老金账户" desc="个人养老金账户现有余额" optionsKey="firstPersonPersonalPension" value={input.firstPersonPersonalPension} onChange={(v) => handle("firstPersonPersonalPension", v)} />
                        <PensionSelect label="第一支柱社保月养老金估计" desc="预计退休后每月可领取" optionsKey="firstPersonSocialPension" value={input.firstPersonSocialPension} onChange={(v) => handle("firstPersonSocialPension", v)} />
                        <PensionSelect label="第一支柱缴费年限" desc="计划缴纳养老金的年数" optionsKey="firstPersonPayYears" value={input.firstPersonPayYears} onChange={(v) => handle("firstPersonPayYears", v)} />
                        <PensionSelect label="第一支柱年预算" optionsKey="firstPersonPensionBudget" value={input.firstPersonPensionBudget} onChange={(v) => handle("firstPersonPensionBudget", v)} />
                        <PensionSelect label="第二支柱个人养老金账户" optionsKey="secondPersonPersonalPension" value={input.secondPersonPersonalPension} onChange={(v) => handle("secondPersonPersonalPension", v)} />
                        <PensionSelect label="第二支柱社保月养老金估计" optionsKey="secondPersonSocialPension" value={input.secondPersonSocialPension} onChange={(v) => handle("secondPersonSocialPension", v)} />
                        <PensionSelect label="第二支柱缴费年限" optionsKey="secondPersonPayYears" value={input.secondPersonPayYears} onChange={(v) => handle("secondPersonPayYears", v)} />
                        <PensionSelect label="第二支柱年预算" optionsKey="secondPersonPensionBudget" value={input.secondPersonPensionBudget} onChange={(v) => handle("secondPersonPensionBudget", v)} />
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ═══ Health Insurance Table (step 3) ═══ */}
              {step === 3 && (
                <div className="max-w-2xl mx-auto">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-sage-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: PAGE_ICONS[2] }} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-text-primary font-display">健康险配置</h1>
                      <p className="text-xs text-text-tertiary">勾选家庭成员已有的健康险，勾选后可填写详细信息</p>
                    </div>
                  </motion.div>

                  <div className="glass rounded-card overflow-hidden border border-white/50">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-sage-100 bg-sage-50/50">
                          <th className="text-left px-5 py-3.5 text-xs font-semibold text-text-secondary">险种</th>
                          {MEMBERS.map((m) => (
                            <th key={m.key} className="px-3 py-3.5 text-xs font-semibold text-text-secondary text-center">{m.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {HI_TYPES.map((type, ti) => (
                          <tr key={type} className="border-b border-sage-100/50 last:border-0">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: HI_COLORS[ti] }} />
                                <span className="text-sm font-medium text-text-primary">{type}</span>
                              </div>
                            </td>
                            {MEMBERS.map((m) => {
                              const fieldKey = `${m.key}_${type}` as keyof typeof input;
                              const checked = Boolean(input[fieldKey] ?? false);
                              return (
                                <td key={m.key} className="px-3 py-3.5 text-center">
                                  <label className="inline-flex items-center justify-center cursor-pointer">
                                    <input type="checkbox" checked={checked}
                                      onChange={(e) => handle(fieldKey, e.target.checked)}
                                      className="w-4 h-4 rounded border-sage-300 text-sage-500 focus:ring-sage-300/30 cursor-pointer" />
                                  </label>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Detail forms */}
                  <div className="mt-5 space-y-4">
                    {MEMBERS.map((m) => {
                      const hasAny = HI_TYPES.some((t) => Boolean(input[`${m.key}_${t}` as keyof typeof input]));
                      if (!hasAny) return null;
                      const checkedTypes = HI_TYPES.filter((t) => Boolean(input[`${m.key}_${t}` as keyof typeof input]));
                      const ciKey = m.key === 'p1' ? 'firstPersonCIExisting' as const
                        : m.key === 'p2' ? 'secondPersonCIExisting' as const
                        : m.key === 'child' ? 'childCIExisting' as const
                        : 'parentCIExisting' as const;
                      const miKey = m.key === 'p1' ? 'firstPersonMIExisting' as const
                        : m.key === 'p2' ? 'secondPersonMIExisting' as const
                        : m.key === 'child' ? 'childMIExisting' as const
                        : 'parentMIExisting' as const;
                      return (
                        <motion.div key={m.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                          className="glass rounded-card p-6">
                          <h3 className="text-sm font-semibold text-text-primary mb-3">{m.label} — 已勾选险种详情</h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {checkedTypes.map((t) => (
                              <span key={t} className="text-[11px] px-3 py-1 rounded-full bg-sage-50 text-sage-600 font-medium border border-sage-200/50">{t}</span>
                            ))}
                          </div>
                          {(checkedTypes.includes('重疾险') || checkedTypes.includes('百万医疗') || checkedTypes.includes('中端医疗') || checkedTypes.includes('高端医疗')) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {checkedTypes.includes('重疾险') && (
                                <div>
                                  <label className="text-[11px] font-medium text-text-tertiary mb-1 block">已有重疾险保额（万元）</label>
                                  <input type="text" inputMode="decimal" value={rawValues[ciKey] ?? (input[ciKey] === undefined || input[ciKey] === null ? '' : String(input[ciKey]))} min={0}
                                    onChange={(e) => { const r = e.target.value; if (/^\d*\.?\d*$/.test(r)) handleTextInput(ciKey, r); }}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={() => clearRawVal(ciKey)}
                                    className="w-full text-sm h-9 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none" />
                                </div>
                              )}
                              {(checkedTypes.includes('百万医疗') || checkedTypes.includes('中端医疗') || checkedTypes.includes('高端医疗')) && (
                                <div>
                                  <label className="text-[11px] font-medium text-text-tertiary mb-1 block">已有医疗险保额（万元）</label>
                                  <input type="text" inputMode="decimal" value={rawValues[miKey] ?? (input[miKey] === undefined || input[miKey] === null ? '' : String(input[miKey]))} min={0}
                                    onChange={(e) => { const r = e.target.value; if (/^\d*\.?\d*$/.test(r)) handleTextInput(miKey, r); }}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={() => clearRawVal(miKey)}
                                    className="w-full text-sm h-9 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none" />
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Budget */}
                  <div className="mt-5">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-3">保费预算设置</h3>
                      <p className="text-[11px] text-text-tertiary mb-4">如果不了解具体费用，请选择预算范围，系统将自动按中间值计算</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: "第一支柱重疾险年预算", ciKey: "firstPersonCIPremiumBudget", miKey: "firstPersonMIPremiumBudget" },
                          { label: "第二支柱重疾险年预算", ciKey: "secondPersonCIPremiumBudget", miKey: "secondPersonMIPremiumBudget" },
                        ].map((item) => (
                          <div key={item.ciKey} className="space-y-2">
                            <div>
                              <label className="text-[11px] font-medium text-text-tertiary mb-1 block">{item.label.replace("重疾险", "")}重疾险年预算</label>
                              <select value={Object.entries(BUDGET_CI).find(([, v]) => v === Number(input[item.ciKey as keyof typeof input]))?.[0] || "3-5万"}
                                onChange={(e) => handle(item.ciKey, BUDGET_CI[e.target.value] ?? 4)}
                                className="w-full text-sm h-9 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none">
                                {Object.keys(BUDGET_CI).map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-text-tertiary mb-1 block">{item.label.replace("重疾险", "")}医疗险年预算</label>
                              <select value={Object.entries(BUDGET_MI).find(([, v]) => v === Number(input[item.miKey as keyof typeof input]))?.[0] || "1-3万"}
                                onChange={(e) => handle(item.miKey, BUDGET_MI[e.target.value] ?? 2)}
                                className="w-full text-sm h-9 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none">
                                {Object.keys(BUDGET_MI).map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ═══ Life Insurance (step 4) ═══ */}
              {step === 4 && (
                <div className="max-w-2xl mx-auto">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
                    <div className="w-11 h-11 rounded-xl bg-sage-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: PAGE_ICONS[3] }} />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-text-primary font-display">寿险配置</h1>
                      <p className="text-xs text-text-tertiary">寿险持有情况与偏好</p>
                    </div>
                  </motion.div>

                  <div className="space-y-6">
                    {/* 第一经济支柱 */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-sage-300/80 flex items-center justify-center text-white text-[10px] font-bold">1</span>
                        第一经济支柱
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">偏好的保障期限</label>
                          <select value={input.firstPersonLifeTerm} onChange={(e) => handle("firstPersonLifeTerm", e.target.value)}
                            className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                            {O.firstPersonLifeTerm.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <PensionNumberItem label="年度寿险预算" desc="每年愿意投入寿险的保费" unit="万元" value={input.firstPersonLifeBudget} min={0}
                          rawVal={rawValues['firstPersonLifeBudget']} onTextChange={handleTextInput} onTextBlur={clearRawVal} textKey="firstPersonLifeBudget"
                          onChange={(v) => handle("firstPersonLifeBudget", v)} />
                        <PensionToggle label="是否已有寿险" value={input.firstPersonHasLifeIns} onChange={(v) => handle("firstPersonHasLifeIns", v)} />
                        {input.firstPersonHasLifeIns && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t border-sage-100">
                            <div>
                              <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">已有寿险保额</label>
                              <select value={input.firstPersonLifeCoverage} onChange={(e) => handle("firstPersonLifeCoverage", e.target.value)}
                                className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                                {O.firstPersonLifeCoverage.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">已有寿险剩余年限</label>
                              <select value={input.firstPersonExistingLifeYears} onChange={(e) => handle("firstPersonExistingLifeYears", e.target.value)}
                                className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                                {O.firstPersonExistingLifeYears.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    {/* 第二经济支柱 */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-sage-300/80 flex items-center justify-center text-white text-[10px] font-bold">2</span>
                        第二经济支柱
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">偏好的保障期限</label>
                          <select value={input.secondPersonLifeTerm} onChange={(e) => handle("secondPersonLifeTerm", e.target.value)}
                            className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                            {O.secondPersonLifeTerm.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                        <PensionNumberItem label="年度寿险预算" unit="万元" value={input.secondPersonLifeBudget} min={0}
                          rawVal={rawValues['secondPersonLifeBudget']} onTextChange={handleTextInput} onTextBlur={clearRawVal} textKey="secondPersonLifeBudget"
                          onChange={(v) => handle("secondPersonLifeBudget", v)} />
                        <PensionToggle label="是否已有寿险" value={input.secondPersonHasLifeIns} onChange={(v) => handle("secondPersonHasLifeIns", v)} />
                        {input.secondPersonHasLifeIns && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-4 border-t border-sage-100">
                            <div>
                              <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">已有寿险保额</label>
                              <select value={input.secondPersonLifeCoverage} onChange={(e) => handle("secondPersonLifeCoverage", e.target.value)}
                                className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                                {O.secondPersonLifeCoverage.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">已有寿险剩余年限</label>
                              <select value={input.secondPersonExistingLifeYears} onChange={(e) => handle("secondPersonExistingLifeYears", e.target.value)}
                                className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                                {O.secondPersonExistingLifeYears.map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>

                    {/* 子女父母配置 */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-lg bg-sage-100 flex items-center justify-center text-text-tertiary text-[10px] font-bold">⚙</span>
                        子女与父母配置
                      </h3>
                      <div>
                        <label className="text-[11px] font-medium text-text-tertiary mb-1.5 block">是否为子女和父母配置寿险？</label>
                        <div className="relative max-w-md">
                          <select value={input.childParentLifeIns} onChange={(e) => handle("childParentLifeIns", e.target.value)}
                            className="w-full text-sm h-10 px-4 rounded-input border border-sage-200/50 bg-white/60 focus:border-sage-300 focus:ring-2 focus:ring-sage-300/20 outline-none transition-all text-text-primary appearance-none pr-9">
                            {O.childParentLifeIns.map((o) => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {/* ═══ Result (6) ═══ */}
              {step === 6 && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h1 className="text-2xl font-bold text-text-primary font-display">您的保险配置方案</h1>
                        <p className="text-sm text-text-tertiary mt-1">基于填写信息生成的个性化建议</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-sage-500 font-medium bg-sage-50/80 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <span className={cn("w-1.5 h-1.5 rounded-full", saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-sage-400')} />
                          {saveStatus === 'saving' ? '保存中…' : '已自动保存'}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* 概览卡片 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard label="总保障缺口" value={`${result.totalGap.toFixed(0)} 万元`} trend={result.totalGap > 100 ? "bad" : result.totalGap > 30 ? "neutral" : "good"} />
                    <StatCard label="健康险缺口" value={`${result.totalHealthGap.toFixed(0)} 万元`} trend={result.totalHealthGap > 50 ? "bad" : "good"} />
                    <StatCard label="寿险缺口" value={`${result.totalLifeGap.toFixed(0)} 万元`} trend={result.totalLifeGap > 50 ? "bad" : "good"} />
                    <StatCard label="养老金缺口" value={`${result.totalPensionGap.toFixed(0)} 万元`} trend={result.totalPensionGap > 50 ? "bad" : "good"} />
                    <StatCard label="风险等级" value={result.riskLevel} trend={result.riskLevel === "低风险" ? "good" : result.riskLevel === "中等风险" ? "neutral" : "bad"} />
                    <StatCard label="年度总保费" value={`${result.totalAnnualPrem.toFixed(1)} 万元`} trend={result.totalAnnualPrem > 20 ? "bad" : "neutral"} />
                  </div>

                  {/* 配置优先级提示 */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-card p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    </div>
                    <div><div className="text-sm font-semibold text-text-primary">配置优先级</div><div className="text-sm text-text-secondary mt-0.5">{result.priority}</div></div>
                  </motion.div>

                  {/* 寿险计算说明 */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-card p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage-50 flex items-center justify-center shrink-0 mt-0.5">
                      <svg className="w-5 h-5 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">寿险保障缺口计算说明</div>
                      <div className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                        寿险保额采用<strong>责任法</strong>与<strong>收入法</strong>取最大值：责任法覆盖房贷 × 收入占比 + 年度开销 × 保障年限 + 子女教育 + 父母赡养 − 已有流动资产；收入法覆盖年收入 × 剩余工作年限 × 职业风险系数。保费基于年龄和性别对应的身故发生率表计算。
                      </div>
                    </div>
                  </motion.div>

                  {/* 缺口图表 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4">保障缺口概览</h3>
                      <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={gapData} barSize={28} onMouseLeave={() => setHoveredBar(null)}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#8B948E" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#8B948E" }} /><Tooltip content={renderBarTooltip} /><Bar dataKey="重疾险缺口" fill={C.blue} radius={[6, 6, 0, 0]} onMouseEnter={() => setHoveredBar("重疾险缺口")} /><Bar dataKey="医疗险缺口" fill={C.sage} radius={[6, 6, 0, 0]} onMouseEnter={() => setHoveredBar("医疗险缺口")} /><Bar dataKey="寿险缺口" fill={C.warm} radius={[6, 6, 0, 0]} onMouseEnter={() => setHoveredBar("寿险缺口")} /></BarChart></ResponsiveContainer></div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-card p-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-4">建议保费结构</h3>
                      <div className="h-56 flex items-center justify-center">{pieData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>{pieData.map((_, i) => <Cell key={i} fill={CC[i % CC.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.5)" }} /></PieChart></ResponsiveContainer> : <span className="text-sm text-text-tertiary">暂无数据</span>}</div>
                    </motion.div>
                  </div>

                  {/* 医疗险推荐 */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass rounded-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary">医疗险推荐方案</h3>
                    </div>
                    <p className="text-xs text-text-tertiary mb-4">根据您的收入水平和已有保障，按行业标准推荐的医疗险类型</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "第一经济支柱", income: input.firstPersonIncome, rec: result.firstPerson.recommendedMIType, reason: result.firstPerson.recommendedMIReason },
                        { label: "第二经济支柱", income: input.secondPersonIncome, rec: result.secondPerson.recommendedMIType, reason: result.secondPerson.recommendedMIReason },
                      ].map((p) => (
                        <div key={p.label} className="bg-sage-50/60 rounded-xl p-4 border border-sage-100/50">
                          <div className="text-xs font-semibold text-text-primary mb-2">{p.label}</div>
                          <div className="space-y-1.5 text-xs text-text-secondary">
                            <div className="flex justify-between"><span>年收入</span><span className="font-medium text-text-primary">{p.income}</span></div>
                            <div className="flex justify-between"><span>推荐配置</span><span className="font-medium text-sage-600">{p.rec}</span></div>
                            {p.reason && <div className="text-[10px] text-text-tertiary leading-snug mt-1.5 pt-1.5 border-t border-sage-200/40">{p.reason}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* 年度保费汇总表 */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="glass rounded-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-sage-50 flex items-center justify-center">
                        <svg className="w-4 h-4 text-sage-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary">年度保费预计</h3>
                    </div>
                    <p className="text-xs text-text-tertiary mb-4">按推荐方案计算的年度总保费，单位：万元/年</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-sage-100 bg-sage-50/50">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-secondary">险种</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-secondary">第一支柱</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-text-secondary">第二支柱</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-sage-500">合计</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const p1CI = result.firstPerson.estimatedCIPremium;
                            const p1MI = result.firstPerson.estimatedMIPremium;
                            const p1Life = result.firstPerson.estimatedLifePremium;
                            const p1Pension = result.firstPerson.recommendedPensionAnnual;
                            const p2CI = result.secondPerson.estimatedCIPremium;
                            const p2MI = result.secondPerson.estimatedMIPremium;
                            const p2Life = result.secondPerson.estimatedLifePremium;
                            const p2Pension = result.secondPerson.recommendedPensionAnnual;
                            const rows = [
                              { l: "重疾险保费", p1: p1CI, p2: p2CI },
                              { l: "医疗险保费", p1: p1MI, p2: p2MI },
                              { l: "寿险保费", p1: p1Life, p2: p2Life },
                              { l: "养老金年缴", p1: p1Pension, p2: p2Pension },
                            ];
                            const totalP1 = rows.reduce((s, r) => s + r.p1, 0);
                            const totalP2 = rows.reduce((s, r) => s + r.p2, 0);
                            const totalAll = totalP1 + totalP2;
                            return <>
                              {rows.map((r) => (
                                <tr key={r.l} className="border-b border-sage-100/50">
                                  <td className="px-4 py-2.5 text-sm text-text-secondary">{r.l}</td>
                                  <td className="px-4 py-2.5 text-sm text-right text-text-primary font-medium">{r.p1 > 0 ? r.p1.toFixed(2) : '-'}</td>
                                  <td className="px-4 py-2.5 text-sm text-right text-text-primary font-medium">{r.p2 > 0 ? r.p2.toFixed(2) : '-'}</td>
                                  <td className="px-4 py-2.5 text-sm text-right text-sage-600 font-bold">{(r.p1 + r.p2) > 0 ? (r.p1 + r.p2).toFixed(2) : '-'}</td>
                                </tr>
                              ))}
                              <tr className="bg-sage-50/30">
                                <td className="px-4 py-2.5 text-sm font-bold text-text-primary">合计</td>
                                <td className="px-4 py-2.5 text-sm text-right font-bold text-text-primary">{totalP1.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-sm text-right font-bold text-text-primary">{totalP2.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-sm text-right font-bold text-sage-600">{totalAll.toFixed(2)}</td>
                              </tr>
                            </>;
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary bg-sage-50/60 rounded-xl px-4 py-3">
                      <span>风险指数：</span>
                      <span className="font-bold text-text-primary">{result.riskIndex.toFixed(2)}%</span>
                      <span className={result.riskLevel === "低风险" ? "text-sage-600 font-semibold" : result.riskLevel === "中等风险" ? "text-amber-500 font-semibold" : "text-rose-400 font-semibold"}>{result.riskLevel}</span>
                      <span className="text-text-tertiary">— ≤3.5% 低风险，3.5-9% 中等风险，&gt;9% 高风险</span>
                    </div>
                  </motion.div>

                  {/* 个人支柱 Tabs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{ t: "第一经济支柱", r: result.firstPerson, c: C.sage }, { t: "第二经济支柱", r: result.secondPerson, c: C.sageDark }].map((p) => (
                      <motion.div key={p.t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-card p-6">
                        <h3 className="text-sm font-semibold text-text-primary mb-3">{p.t}</h3>
                        <PersonTabs result={p.r as unknown as Record<string, unknown>} color={p.c} />
                      </motion.div>
                    ))}
                  </div>

                  {/* 子女 & 父母 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{ title: "子女配置建议", color: C.purple, items: [
                      { l: "建议重疾险保额", v: `${result.child.recommendedCICoverage} 万元` }, { l: "重疾险缺口", v: `${result.child.ciGap} 万元`, t: result.child.ciGap > 0 ? "bad" as const : "good" as const }, { l: "建议医疗险类型", v: result.child.recommendedMIType }, { l: "建议意外险保额", v: `${result.child.recommendedAccidentCoverage} 万元` }, { l: "配置优先级", v: result.child.priority }, { l: "寿险建议", v: result.child.lifeConclusion }, { l: "养老金建议", v: result.child.pensionBudgetResult },
                    ]}, { title: "父母配置建议", color: C.amber, items: [
                      { l: "建议重疾险保额", v: `${result.parent.recommendedCICoverage} 万元` }, { l: "重疾险缺口", v: `${result.parent.ciGap} 万元`, t: result.parent.ciGap > 0 ? "bad" as const : "good" as const }, { l: "建议医疗险类型", v: result.parent.recommendedMIType }, { l: "建议意外险保额", v: `${result.parent.recommendedAccidentCoverage} 万元/人` }, { l: "配置优先级", v: result.parent.priority }, { l: "寿险建议", v: result.parent.lifeConclusion }, { l: "养老金建议", v: result.parent.pensionBudgetResult },
                    ]}].map((card) => (
                      <motion.div key={card.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-card p-6">
                        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                            <svg className="w-3.5 h-3.5" style={{ color: card.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
                          </span>
                          {card.title}
                        </h3>
                        {card.items.map((item) => (
                          <div key={item.l} className="flex justify-between items-center py-2 border-b border-sage-100 last:border-0">
                            <span className="text-sm text-text-secondary">{item.l}</span>
                            <span className={cn("text-sm font-semibold", item.t === "bad" ? "text-rose-400" : item.t === "good" ? "text-sage-600" : "text-text-primary")}>{item.v}</span>
                          </div>
                        ))}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Bottom Nav ─── */}
      <div className="border-t border-white/30 glass shrink-0">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <motion.button onClick={() => goTo(step - 1)} disabled={step === 0}
              whileHover={step > 0 ? { scale: 1.02 } : {}}
              className={cn("px-6 py-2.5 text-sm font-medium rounded-button transition-all", step === 0 ? "text-sage-200 cursor-not-allowed" : "text-text-secondary hover:bg-white/30")}>
              ← 上一步
            </motion.button>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <button key={i} onClick={() => i <= step && goTo(i)}
                  className={cn("w-2 h-2 rounded-full transition-all duration-300", i === step ? "bg-sage-400 scale-125" : i < step ? "bg-sage-300/60" : "bg-sage-200/50")} />
              ))}
            </div>
            {step > 0 && (
              <motion.button onClick={() => goTo(step + 1)} disabled={step === 6}
                whileHover={step < 6 ? { scale: 1.02 } : {}}
                className={cn("px-6 py-2.5 text-sm font-medium rounded-button transition-all", step === 6 ? "text-sage-200 cursor-not-allowed" : "bg-sage-300/80 text-text-primary hover:bg-sage-300 hover:shadow-[0_8px_25px_rgba(168,181,162,0.15)]")}>
                {step === 5 ? "查看结果 →" : "下一步 →"}
              </motion.button>
            )}
          </div>
      </div>

      {/* 恢复数据弹窗 */}
      {showRestore && (
        <RestoreDialog onRestore={handleRestore} onDismiss={handleDismissRestore} />
      )}
      </div>

    </>
  );
}
