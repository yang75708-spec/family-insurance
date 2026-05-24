"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { defaultInput } from "@/lib/calculator/defaultInput";
import { calculate } from "@/lib/calculator/formulaEngine";
import type { UserInput, InsuranceResult } from "@/lib/calculator/types";

// ─── Colors ───
const C = { teal: "#0d9488", blue: "#3b82f6", emerald: "#10b981", amber: "#f59e0b", rose: "#f43f5e", purple: "#a855f7" };
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

// Health insurance type labels
const HI_TYPES = ["社保医保", "惠民保", "百万医疗", "中端医疗", "高端医疗", "重疾险"] as const;
const HI_COLORS = ["#0d9488", "#8b5cf6", "#3b82f6", "#f59e0b", "#f43f5e", "#06b6d4"];
const MEMBERS = [
  { key: "p1", label: "第一支柱" },
  { key: "p2", label: "第二支柱" },
  { key: "child", label: "子女" },
  { key: "parent", label: "父母" },
] as const;

// ─── Options ───
const O: Record<string, string[]> = {
  firstPersonIncome: ["15万以下", "15-30万", "30-60万", "60-100万", "100-300万", "300-500万", "500-1000万", "1000万以上"],
  secondPersonIncome: ["15万以下", "15-30万", "30-60万", "60-100万", "100-300万", "300-500万", "500-1000万", "1000万以上"],
  incomeStability: ["非常稳定（公务员/国企/事业单位）", "较稳定（大型企业核心岗）", "一般（中小企/绩效占比高）", "不稳定（自由职业/创业/销售）"],
  incomeStability2: ["非常稳定（公务员/国企/事业单位）", "较稳定（大型企业核心岗）", "一般（中小企/绩效占比高）", "不稳定（自由职业/创业/销售）"],
  mortgageBalance: ["大于等于100万", "大于等于50万小于100万", "无房贷"],
  otherLoanAmount: ["20万以内", "10-20万", "20-50万", "50万以上", "无其他贷款"],
  bankDeposit: ["5万以下", "5-20万", "20-50万", "50-100万", "100-300万", "300-500万", "500-1000万", "1000万以上"],
  lowRiskInvestment: ["无", "5万以内", "5-20万", "20-50万", "50万以上"],
  annualExpense: ["5万以下", "5-10万", "10-20万", "20-50万", "50万以上"],
  city: ["北上深", "二线城市", "普通地级市", "县城"],
  ciBudget: ["1万以下", "1-3万", "3-5万", "5-10万", "10万以上"],
  miBudget: ["0.5万以下", "0.5-1万", "1-3万", "3-5万", "5万以上"],
  childParentLifeIns: ["都不需要", "仅子女", "仅父母", "都需要"],
  firstPersonLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  secondPersonLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  childLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  parentLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  firstPersonLifeTerm: ["65岁", "63岁", "70岁", "终身"],
  secondPersonLifeTerm: ["65岁", "63岁", "70岁", "终身"],
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
      { key: "parentSupportCount", label: "需要赡养几位父母？", icon: I.home, type: "number", min: 0, max: 6 },
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
    questions: [
      // 健康险表格式多选 - 使用专用渲染
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
      { key: "firstPersonLifeBudget", label: "第一支柱年度寿险预算", desc: "每年愿意投入寿险的保费", icon: I.wallet, type: "number", unit: "元", min: 0 },
      { key: "secondPersonLifeBudget", label: "第二支柱年度寿险预算", icon: I.wallet, type: "number", unit: "元", min: 0 },
    ],
  },
  {
    title: "养老金配置",
    subtitle: "退休规划与现有养老储备",
    questions: [
      { key: "firstPersonRetireAge", label: "第一支柱计划退休年龄", desc: "越早退休需要储备越多养老金", icon: I.clock, type: "number", unit: "岁", min: 50, max: 70 },
      { key: "secondPersonRetireAge", label: "第二支柱计划退休年龄", icon: I.clock, type: "number", unit: "岁", min: 50, max: 70 },
      { key: "firstPersonRetireYears", label: "第一支柱退休后生活年限", desc: "预计退休后需要维持生活质量的年数", icon: I.clock, type: "number", unit: "年", min: 5, max: 40 },
      { key: "secondPersonRetireYears", label: "第二支柱退休后生活年限", icon: I.clock, type: "number", unit: "年", min: 5, max: 40 },
      { key: "firstPersonRetireGoal", label: "第一支柱退休后年生活目标", desc: "退休后每年需要的生活费用", icon: I.wallet, type: "number", unit: "万元", min: 0, step: 0.5 },
      { key: "secondPersonRetireGoal", label: "第二支柱退休后年生活目标", icon: I.wallet, type: "number", unit: "万元", min: 0, step: 0.5 },
      { key: "firstPersonPensionFund", label: "第一支柱养老专项存款", desc: "已预留的养老资金", icon: I.bank, type: "number", unit: "元", min: 0 },
      { key: "secondPersonPensionFund", label: "第二支柱养老专项存款", icon: I.bank, type: "number", unit: "元", min: 0 },
      { key: "firstPersonComPension", label: "第一支柱商业养老金价值", icon: I.bank, type: "number", unit: "元", min: 0 },
      { key: "secondPersonComPension", label: "第二支柱商业养老金价值", icon: I.bank, type: "number", unit: "元", min: 0 },
      { key: "firstPersonPersonalPension", label: "第一支柱个人养老金账户", icon: I.bank, type: "number", unit: "元", min: 0 },
      { key: "secondPersonPersonalPension", label: "第二支柱个人养老金账户", icon: I.bank, type: "number", unit: "元", min: 0 },
      { key: "firstPersonSocialPension", label: "第一支柱社保月养老金估计", desc: "预计退休后每月可领取的社保养老金", icon: I.wallet, type: "number", unit: "元/月", min: 0 },
      { key: "secondPersonSocialPension", label: "第二支柱社保月养老金估计", icon: I.wallet, type: "number", unit: "元/月", min: 0 },
      { key: "firstPersonPayYears", label: "第一支柱养老金缴费年限", desc: "计划缴纳养老金的年数", icon: I.clock, type: "number", unit: "年", min: 0, max: 40 },
      { key: "secondPersonPayYears", label: "第二支柱养老金缴费年限", icon: I.clock, type: "number", unit: "年", min: 0, max: 40 },
      { key: "firstPersonPensionBudget", label: "第一支柱养老金年预算", icon: I.wallet, type: "number", unit: "元", min: 0 },
      { key: "secondPersonPensionBudget", label: "第二支柱养老金年预算", icon: I.wallet, type: "number", unit: "元", min: 0 },
    ],
  },
];

// ─── Shared Components ───
function StatCard({ label, value, trend }: { label: string; value: string; trend?: "good" | "bad" | "neutral" }) {
  const tc = { good: "text-emerald-600", bad: "text-rose-500", neutral: "text-amber-500" };
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
      <div className="text-[11px] font-semibold text-[#a3a3a3] tracking-wider uppercase mb-1">{label}</div>
      <div className={cn("text-[26px] font-bold tracking-tight", trend ? tc[trend] : "text-[#171717]")}>{value}</div>
    </motion.div>
  );
}

function R({ label, value, trend }: { label: string; value: string; trend?: "good" | "bad" | "neutral" }) {
  const tc = { good: "text-emerald-600", bad: "text-rose-500", neutral: "text-amber-600" };
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[#f0f0f0] last:border-0">
      <span className="text-sm text-[#525252]">{label}</span>
      <span className={cn("text-sm font-semibold", trend ? tc[trend] : "text-[#171717]")}>{value}</span>
    </div>
  );
}

function PersonTabs({ result, color }: { result: Record<string, unknown>; color: string }) {
  const [tab, setTab] = useState<"health" | "life" | "pension">("health");
  const tabs = [{ k: "health" as const, l: "健康险" }, { k: "life" as const, l: "寿险" }, { k: "pension" as const, l: "养老金" }];
  const panels: Record<string, React.ReactNode> = {
    health: (<><R label="建议重疾险保额" value={`${Number(result.recommendedCICoverage).toFixed(0)} 万元`} /><R label="重疾险缺口" value={`${Number(result.ciGap).toFixed(0)} 万元`} trend={Number(result.ciGap) > 20 ? "bad" : "good"} /><R label="建议医疗险类型" value={String(result.recommendedMIType)} /><R label="医疗险缺口" value={`${Number(result.miGap).toFixed(1)} 万元`} trend={Number(result.miGap) > 10 ? "bad" : "good"} /><R label="重疾险年保费" value={`${Number(result.estimatedCIPremium).toFixed(2)} 万元`} /><R label="预算检验" value={String(result.healthBudgetResult)} trend={String(result.healthBudgetResult).includes("✅") ? "good" : "bad"} /></>),
    life: (<><R label="建议寿险保额" value={`${Number(result.recommendedLifeCoverage).toFixed(0)} 万元`} /><R label="寿险缺口" value={`${Number(result.lifeGap).toFixed(0)} 万元`} trend={Number(result.lifeGap) > 50 ? "bad" : "good"} /><R label="预估年保费" value={`${Number(result.estimatedLifePremium).toFixed(0)} 元`} /><R label="预算检验" value={String(result.lifeBudgetResult)} trend={String(result.lifeBudgetResult).includes("✅") ? "good" : "bad"} /><R label="配置建议" value={String(result.lifeTermSuggestion)} /></>),
    pension: (<><R label="建议年补充养老金" value={`${Number(result.recommendedPensionAnnual).toFixed(0)} 元`} /><R label="养老金缺口" value={`${Number(result.pensionGap).toFixed(0)} 元`} trend={Number(result.pensionGap) > 50 ? "bad" : "good"} /><R label="已有储备终值" value={`${Number(result.existingPensionFV).toFixed(0)} 元`} /><R label="缴费年限" value={`${Number(result.payYears).toFixed(0)} 年`} /><R label="预算检验" value={String(result.pensionBudgetResult)} trend={String(result.pensionBudgetResult).includes("✅") ? "good" : "bad"} /></>),
  };
  return (
    <div>
      <div className="flex gap-1 p-0.5 bg-[#f5f5f5] rounded-lg mb-4">
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", tab === t.k ? "bg-white shadow-sm text-[#171717]" : "text-[#a3a3a3]")}>{t.l}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>{panels[tab]}</motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Question Item ───
function QuestionItem({ q, val, onChange, index }: { q: Q; val: unknown; onChange: (k: string, v: unknown) => void; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className="group"
    >
      <div className="bg-white rounded-xl border border-[#e8e8e8] p-5 transition-all duration-200 hover:border-[#d4d4d4] hover:shadow-sm">
        <div className="flex items-start gap-3.5">
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-[#f0fdfa] flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4.5 h-4.5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: q.icon }} />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-semibold text-[#171717]">{q.label}</span>
              {q.desc && (
                <span className="hidden sm:inline text-[11px] text-[#a3a3a3] truncate">— {q.desc}</span>
              )}
            </div>
            {q.desc && <p className="text-[11px] text-[#a3a3a3] mb-3 sm:hidden">{q.desc}</p>}
            {q.type === "select" ? (
              <div className="relative max-w-md">
                <select value={String(val ?? "")} onChange={(e) => onChange(q.key, e.target.value)}
                  className="w-full text-sm h-10 px-3.5 rounded-lg border border-[#e8e8e8] bg-white focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none transition-all text-[#171717] appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%23737373%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.625rem_center] bg-no-repeat pr-9">
                  <option value="" disabled>请选择</option>
                  {(O[q.key] || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ) : (
              <div className="relative max-w-xs">
                <input type="number" value={Number(val ?? 0)} onChange={(e) => onChange(q.key, Number(e.target.value))}
                  min={q.min} max={q.max} step={q.step}
                  className="w-full text-sm h-10 px-3.5 rounded-lg border border-[#e8e8e8] bg-white focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none transition-all text-[#171717]" />
                {q.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#a3a3a3] pointer-events-none font-medium">{q.unit}</span>}
              </div>
            )}
            {/* Quick hint dots for select fields */}
            {q.type === "select" && O[q.key] && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {O[q.key].slice(0, 5).map((opt) => (
                  <button key={opt} onClick={() => onChange(q.key, opt)}
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full border transition-all",
                      val === opt
                        ? "bg-[#0d9488] text-white border-[#0d9488]"
                        : "bg-white text-[#a3a3a3] border-[#e8e8e8] hover:border-[#0d9488] hover:text-[#0d9488]"
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

// ─── Main Page ───
export default function Home() {
  const [input, setInput] = useState<UserInput>(defaultInput);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(0);

  const result = useMemo<InsuranceResult>(() => calculate(input), [input]);
  const handle = useCallback((k: string, v: unknown) => setInput((p) => setN(p, k, v)), []);

  const goTo = (s: number) => { setDir(s > step ? 1 : -1); setStep(s); };

  const gapData = useMemo(() => [
    { name: "第一支柱", 重疾险缺口: result.firstPerson.ciGap, 医疗险缺口: result.firstPerson.miGap, 寿险缺口: result.firstPerson.lifeGap },
    { name: "第二支柱", 重疾险缺口: result.secondPerson.ciGap, 医疗险缺口: result.secondPerson.miGap, 寿险缺口: result.secondPerson.lifeGap },
  ], [result]);

  const pieData = useMemo(() => [
    { name: "重疾险保费", value: Math.round((result.firstPerson.estimatedCIPremium + result.secondPerson.estimatedCIPremium) * 100) / 100 },
    { name: "医疗险保费", value: Math.round((result.firstPerson.estimatedMIPremium + result.secondPerson.estimatedMIPremium) * 100) / 100 },
  ].filter(i => i.value > 0), [result]);

  const LABELS = ["欢迎", "家庭信息", "财务状况", "健康险", "寿险", "养老金", "结果"];

  return (
    <div className="min-h-screen bg-[#f8f7f4] flex flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-white/80 border-b border-[#e8e8e8]">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0d9488] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#171717]">家庭保险配置</span>
          </div>
          <span className="text-[11px] text-[#a3a3a3] font-medium">{step + 1} / 7</span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-[#e8e8e8]">
          <motion.div className="h-full bg-[#0d9488]" initial={false} animate={{ width: `${(step / 6) * 100}%` }} transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }} />
        </div>
        {/* Step labels */}
        <div className="max-w-3xl mx-auto px-5 py-2 flex justify-between overflow-x-auto gap-1">
          {LABELS.map((l, i) => (
            <button key={l} onClick={() => i <= step && goTo(i)}
              className={cn("text-[10px] font-medium whitespace-nowrap transition-colors", i === step ? "text-[#0d9488]" : i < step ? "text-[#0d9488]/60 hover:text-[#0d9488]" : "text-[#d4d4d4] cursor-default")}>
              {l}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 max-w-3xl mx-auto w-full px-5 py-8">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div key={step} custom={dir} variants={{
              enter: (d: number) => ({ x: d > 0 ? 320 : -320, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? -320 : 320, opacity: 0 }),
            }} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }} className="w-full">

              {/* ═══ Welcome (0) ═══ */}
              {step === 0 && (
                <div className="min-h-[65vh] flex flex-col items-center justify-center text-center px-4">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}>
                    <div className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-[#0d9488] to-[#0f766e] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-[#0d9488]/25">
                      <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                  </motion.div>
                  <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.5 }} className="text-[32px] font-bold text-[#171717] tracking-tight">家庭保险配置决策工具</motion.h1>
                  <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="text-[#737373] text-sm mt-4 max-w-sm leading-relaxed">
                    基于精算模型，科学评估家庭保障需求，<br />为您量身定制最优保险配置方案。
                  </motion.p>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="flex items-center gap-3 mt-6 text-[#a3a3a3] text-xs">
                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>5 步填写</span>
                    <span className="w-1 h-1 rounded-full bg-[#d4d4d4]" />
                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>实时测算</span>
                    <span className="w-1 h-1 rounded-full bg-[#d4d4d4]" />
                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>科学配置</span>
                  </motion.div>
                  <motion.button onClick={() => goTo(1)} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}
                    className="mt-10 px-10 py-3.5 bg-[#0d9488] text-white text-sm font-semibold rounded-xl hover:bg-[#0f766e] transition-all shadow-lg shadow-[#0d9488]/25 active:scale-[0.97]">
                    开始配置 →
                  </motion.button>
                </div>
              )}

              {/* ═══ Input Pages (1-5, special case step 3) ═══ */}
              {step >= 1 && step <= 5 && step !== 3 && (
                <div>
                  {/* Page header */}
                  <div className="flex items-center gap-3 mb-7">
                    <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: PAGE_ICONS[step - 1] }} />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-[#171717]">{PAGES[step - 1].title}</h1>
                      <p className="text-xs text-[#a3a3a3]">{PAGES[step - 1].subtitle}</p>
                    </div>
                  </div>

                  {/* Questions */}
                  <div className="space-y-3">
                    {PAGES[step - 1].questions.map((q, i) => (
                      <QuestionItem key={q.key} q={q} val={(input as unknown as Record<string, unknown>)[q.key]} onChange={handle} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {/* ═══ Health Insurance Table (step 3) ═══ */}
              {step === 3 && (
                <div>
                  <div className="flex items-center gap-3 mb-7">
                    <div className="w-10 h-10 rounded-xl bg-[#f0fdfa] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor" dangerouslySetInnerHTML={{ __html: PAGE_ICONS[2] }} />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-[#171717]">健康险配置</h1>
                      <p className="text-xs text-[#a3a3a3]">勾选家庭成员已有的健康险，勾选后可填写详细信息</p>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#737373]">险种</th>
                          {MEMBERS.map((m) => (
                            <th key={m.key} className="px-3 py-3 text-xs font-semibold text-[#737373] text-center">{m.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {HI_TYPES.map((type, ti) => (
                          <tr key={type} className="border-b border-[#e8e8e8] last:border-0">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: HI_COLORS[ti] }} />
                                <span className="text-sm font-medium text-[#171717]">{type}</span>
                              </div>
                            </td>
                            {MEMBERS.map((m) => {
                              const fieldKey = `${m.key}_${type}` as keyof typeof input;
                              const checked = Boolean(input[fieldKey] ?? false);
                              return (
                                <td key={m.key} className="px-3 py-3 text-center">
                                  <label className="inline-flex items-center justify-center cursor-pointer">
                                    <input type="checkbox" checked={checked}
                                      onChange={(e) => handle(fieldKey, e.target.checked)}
                                      className="w-4 h-4 rounded border-[#d4d4d4] text-[#0d9488] focus:ring-[#0d9488]/20 cursor-pointer" />
                                  </label>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Detail forms for checked items */}
                  <div className="mt-5 space-y-4">
                    {MEMBERS.map((m) => {
                      const hasAny = HI_TYPES.some((t) => Boolean(input[`${m.key}_${t}` as keyof typeof input]));
                      if (!hasAny) return null;
                      const checkedTypes = HI_TYPES.filter((t) => Boolean(input[`${m.key}_${t}` as keyof typeof input]));
                      const label = m.label;
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
                          className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                          <h3 className="text-sm font-semibold text-[#171717] mb-3">{label} - 已勾选险种详情</h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {checkedTypes.map((t) => (
                              <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-[#f0fdfa] text-[#0d9488] font-medium border border-[#ccfbf1]">{t}</span>
                            ))}
                          </div>
                          {(checkedTypes.includes('重疾险') || checkedTypes.includes('百万医疗') || checkedTypes.includes('中端医疗') || checkedTypes.includes('高端医疗')) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                              {checkedTypes.includes('重疾险') && (
                                <div>
                                  <label className="text-[11px] font-medium text-[#737373] mb-1 block">已有重疾险保额（万元）</label>
                                  <input type="number" value={Number(input[ciKey] ?? 0)} min={0}
                                    onChange={(e) => handle(ciKey, Number(e.target.value))}
                                    className="w-full text-sm h-9 px-3 rounded-lg border border-[#e8e8e8] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none" />
                                </div>
                              )}
                              {(checkedTypes.includes('百万医疗') || checkedTypes.includes('中端医疗') || checkedTypes.includes('高端医疗')) && (
                                <div>
                                  <label className="text-[11px] font-medium text-[#737373] mb-1 block">已有医疗险保额（万元）</label>
                                  <input type="number" value={Number(input[miKey] ?? 0)} min={0}
                                    onChange={(e) => handle(miKey, Number(e.target.value))}
                                    className="w-full text-sm h-9 px-3 rounded-lg border border-[#e8e8e8] focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none" />
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Budget Section */}
                  <div className="mt-5">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                      <h3 className="text-sm font-semibold text-[#171717] mb-4">保费预算设置</h3>
                      <p className="text-[11px] text-[#a3a3a3] mb-4">如果不了解具体费用，请选择预算范围，系统将自动按中间值计算</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { label: "第一支柱重疾险年预算", ciKey: "firstPersonCIPremiumBudget", miKey: "firstPersonMIPremiumBudget" },
                          { label: "第二支柱重疾险年预算", ciKey: "secondPersonCIPremiumBudget", miKey: "secondPersonMIPremiumBudget" },
                        ].map((item) => (
                          <div key={item.ciKey} className="space-y-2">
                            <div>
                              <label className="text-[11px] font-medium text-[#737373] mb-1 block">{item.label.replace("重疾险", "")}重疾险年预算</label>
                              <select value={Object.entries(BUDGET_CI).find(([, v]) => v === Number(input[item.ciKey as keyof typeof input]))?.[0] || "3-5万"}
                                onChange={(e) => handle(item.ciKey, BUDGET_CI[e.target.value] ?? 4)}
                                className="w-full text-sm h-9 px-3 rounded-lg border border-[#e8e8e8] bg-white focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none">
                                {Object.keys(BUDGET_CI).map((o) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] font-medium text-[#737373] mb-1 block">{item.label.replace("重疾险", "")}医疗险年预算</label>
                              <select value={Object.entries(BUDGET_MI).find(([, v]) => v === Number(input[item.miKey as keyof typeof input]))?.[0] || "1-3万"}
                                onChange={(e) => handle(item.miKey, BUDGET_MI[e.target.value] ?? 2)}
                                className="w-full text-sm h-9 px-3 rounded-lg border border-[#e8e8e8] bg-white focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none">
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

              {/* ═══ Result (6) ═══ */}
              {step === 6 && (
                <div className="space-y-5">
                  <div className="mb-4">
                    <h1 className="text-lg font-bold text-[#171717]">您的保险配置方案</h1>
                    <p className="text-xs text-[#a3a3a3] mt-1">基于填写信息生成的个性化建议</p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label="总保障缺口" value={`${result.totalGap.toFixed(0)} 万元`} trend={result.totalGap > 100 ? "bad" : result.totalGap > 30 ? "neutral" : "good"} />
                    <StatCard label="健康险缺口" value={`${result.totalHealthGap.toFixed(0)} 万元`} trend={result.totalHealthGap > 50 ? "bad" : "good"} />
                    <StatCard label="寿险缺口" value={`${result.totalLifeGap.toFixed(0)} 万元`} trend={result.totalLifeGap > 50 ? "bad" : "good"} />
                    <StatCard label="风险等级" value={result.riskLevel} trend={result.riskLevel === "低风险" ? "good" : result.riskLevel === "中等风险" ? "neutral" : "bad"} />
                    <StatCard label="年度总保费" value={`${result.totalAnnualPrem.toFixed(1)} 万元`} trend={result.totalAnnualPrem > 20 ? "bad" : "neutral"} />
                  </div>
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#e8e8e8] p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#ccfbf1] flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    </div>
                    <div><div className="text-sm font-semibold text-[#171717]">配置优先级</div><div className="text-sm text-[#737373] mt-0.5">{result.priority}</div></div>
                  </motion.div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                      <h3 className="text-[13px] font-semibold text-[#171717] mb-4">保障缺口概览</h3>
                      <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={gapData} barSize={28}><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#737373" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a3a3a3" }} /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e8e8e8" }} /><Bar dataKey="重疾险缺口" fill={C.blue} radius={[4, 4, 0, 0]} /><Bar dataKey="医疗险缺口" fill={C.emerald} radius={[4, 4, 0, 0]} /><Bar dataKey="寿险缺口" fill={C.amber} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                      <h3 className="text-[13px] font-semibold text-[#171777] mb-4">建议保费结构</h3>
                      <div className="h-56 flex items-center justify-center">{pieData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>{pieData.map((_, i) => <Cell key={i} fill={CC[i % CC.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e8e8e8" }} /></PieChart></ResponsiveContainer> : <span className="text-sm text-[#a3a3a3]">暂无数据</span>}</div>
                    </motion.div>
                  </div>
                  {/* ═══ 医疗险推荐（基于收入+已有保障） ═══ */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#f0fdfa] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      </div>
                      <h3 className="text-sm font-semibold text-[#171717]">医疗险推荐方案</h3>
                    </div>
                    <p className="text-[11px] text-[#a3a3a3] mb-4">根据您的收入水平和已有保障，按行业标准推荐的医疗险类型</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { label: "第一经济支柱", income: input.firstPersonIncome, rec: result.firstPerson.recommendedMIType },
                        { label: "第二经济支柱", income: input.secondPersonIncome, rec: result.secondPerson.recommendedMIType },
                      ].map((p) => (
                        <div key={p.label} className="bg-[#fafafa] rounded-lg p-4 border border-[#e8e8e8]">
                          <div className="text-xs font-semibold text-[#171717] mb-2">{p.label}</div>
                          <div className="space-y-1.5 text-xs text-[#737373]">
                            <div className="flex justify-between"><span>年收入</span><span className="font-medium text-[#171717]">{p.income}</span></div>
                            <div className="flex justify-between"><span>推荐配置</span><span className="font-medium text-[#0d9488]">{p.rec}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* ═══ 年度保费汇总表 ═══ */}
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#f0fdfa] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-sm font-semibold text-[#171717]">年度保费预计</h3>
                    </div>
                    <p className="text-[11px] text-[#a3a3a3] mb-4">按推荐方案计算的年度总保费，单位：万元/年</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#737373]">险种</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#737373]">第一支柱</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#737373]">第二支柱</th>
                            <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#0d9488]">合计</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const p1CI = result.firstPerson.estimatedCIPremium;
                            const p1MI = result.firstPerson.estimatedMIPremium;
                            const p1Life = result.firstPerson.estimatedLifePremium / 10000;
                            const p1Pension = result.firstPerson.recommendedPensionAnnual / 10000;
                            const p2CI = result.secondPerson.estimatedCIPremium;
                            const p2MI = result.secondPerson.estimatedMIPremium;
                            const p2Life = result.secondPerson.estimatedLifePremium / 10000;
                            const p2Pension = result.secondPerson.recommendedPensionAnnual / 10000;
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
                                <tr key={r.l} className="border-b border-[#f0f0f0]">
                                  <td className="px-4 py-2.5 text-sm text-[#525252]">{r.l}</td>
                                  <td className="px-4 py-2.5 text-sm text-right text-[#171717] font-medium">{r.p1 > 0 ? r.p1.toFixed(2) : '-'}</td>
                                  <td className="px-4 py-2.5 text-sm text-right text-[#171717] font-medium">{r.p2 > 0 ? r.p2.toFixed(2) : '-'}</td>
                                  <td className="px-4 py-2.5 text-sm text-right text-[#0d9488] font-bold">{(r.p1 + r.p2) > 0 ? (r.p1 + r.p2).toFixed(2) : '-'}</td>
                                </tr>
                              ))}
                              <tr className="bg-[#fafafa]">
                                <td className="px-4 py-2.5 text-sm font-bold text-[#171717]">合计</td>
                                <td className="px-4 py-2.5 text-sm text-right font-bold text-[#171717]">{totalP1.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-sm text-right font-bold text-[#171717]">{totalP2.toFixed(2)}</td>
                                <td className="px-4 py-2.5 text-sm text-right font-bold text-[#0d9488]">{totalAll.toFixed(2)}</td>
                              </tr>
                            </>;
                          })()}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-[#737373] bg-[#fafafa] rounded-lg px-4 py-2.5">
                      <span>保费/收入比：</span>
                      <span className="font-bold text-[#171717]">{result.premiumToIncomeRatio.toFixed(2)}</span>
                      <span className="text-[#a3a3a3]">（</span>
                      <span className={result.premiumToIncomeRatio < 1 ? "text-emerald-600 font-semibold" : result.premiumToIncomeRatio <= 3 ? "text-amber-500 font-semibold" : "text-rose-500 font-semibold"}>{result.riskLevel}</span>
                      <span className="text-[#a3a3a3]"> — &lt;1 低风险，1-3 中风险，&gt;3 高风险）</span>
                    </div>
                  </motion.div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{ t: "第一经济支柱", r: result.firstPerson, c: "#0d9488" }, { t: "第二经济支柱", r: result.secondPerson, c: "#2563eb" }].map((p) => (
                      <motion.div key={p.t} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                        <h3 className="text-sm font-semibold text-[#171717] mb-3">{p.t}</h3>
                        <PersonTabs result={p.r as unknown as Record<string, unknown>} color={p.c} />
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[{ title: "子女配置建议", color: C.purple, items: [
                      { l: "建议重疾险保额", v: `${result.child.recommendedCICoverage} 万元` }, { l: "重疾险缺口", v: `${result.child.ciGap} 万元`, t: result.child.ciGap > 0 ? "bad" as const : "good" as const }, { l: "建议医疗险类型", v: result.child.recommendedMIType }, { l: "建议意外险保额", v: `${result.child.recommendedAccidentCoverage} 万元` }, { l: "配置优先级", v: result.child.priority }, { l: "寿险建议", v: result.child.lifeConclusion }, { l: "养老金建议", v: result.child.pensionBudgetResult },
                    ]}, { title: "父母配置建议", color: C.amber, items: [
                      { l: "建议重疾险保额", v: `${result.parent.recommendedCICoverage} 万元` }, { l: "重疾险缺口", v: `${result.parent.ciGap} 万元`, t: result.parent.ciGap > 0 ? "bad" as const : "good" as const }, { l: "建议医疗险类型", v: result.parent.recommendedMIType }, { l: "建议意外险保额", v: result.parent.recommendedAccidentCoverage }, { l: "配置优先级", v: result.parent.priority }, { l: "寿险建议", v: result.parent.lifeConclusion }, { l: "养老金建议", v: result.parent.pensionBudgetResult },
                    ]}].map((card) => (
                      <motion.div key={card.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl border border-[#e8e8e8] p-5">
                        <h3 className="text-sm font-semibold text-[#171717] mb-4 flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                            <svg className="w-3.5 h-3.5" style={{ color: card.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
                          </span>
                          {card.title}
                        </h3>
                        {card.items.map((item) => (
                          <div key={item.l} className="flex justify-between items-center py-2 border-b border-[#f0f0f0] last:border-0">
                            <span className="text-sm text-[#525252]">{item.l}</span>
                            <span className={cn("text-sm font-semibold", item.t === "bad" ? "text-rose-500" : item.t === "good" ? "text-emerald-600" : "text-[#171717]")}>{item.v}</span>
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

        {/* ─── Bottom Nav ─── */}
        <div className="border-t border-[#e8e8e8] bg-white">
          <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
            <button onClick={() => goTo(step - 1)} disabled={step === 0}
              className={cn("px-5 py-2 text-sm font-medium rounded-lg transition-all", step === 0 ? "text-[#d4d4d4] cursor-not-allowed" : "text-[#737373] hover:text-[#171717] hover:bg-[#f5f5f5]")}>
              ← 上一步
            </button>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <button key={i} onClick={() => i <= step && goTo(i)}
                  className={cn("w-2 h-2 rounded-full transition-all duration-300", i === step ? "bg-[#0d9488] scale-125" : i < step ? "bg-[#0d9488]/40" : "bg-[#e8e8e8]")} />
              ))}
            </div>
            <button onClick={() => goTo(step + 1)} disabled={step === 6}
              className={cn("px-5 py-2 text-sm font-medium rounded-lg transition-all", step === 6 ? "text-[#d4d4d4] cursor-not-allowed" : "bg-[#0d9488] text-white hover:bg-[#0f766e] active:scale-[0.97]")}>
              {step === 0 ? "开始配置 →" : step === 5 ? "查看结果 →" : "下一步 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
