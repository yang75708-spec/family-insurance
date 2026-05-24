"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { defaultInput } from "@/lib/calculator/defaultInput";
import { calculate } from "@/lib/calculator/formulaEngine";
import type { UserInput, InsuranceResult } from "@/lib/calculator/types";

// ──────── Animations ────────
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

// ──────── Color palette ────────
const colors = {
  teal: "#0d9488",
  tealLight: "#ccfbf1",
  blue: "#3b82f6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  purple: "#a855f7",
};

const CHART_COLORS = [colors.blue, colors.emerald, colors.amber, colors.rose];

// ──────── Helpers ────────
function setNested(obj: UserInput, key: string, value: unknown): UserInput {
  const c = { ...obj } as Record<string, unknown>;
  c[key] = value;
  return c as unknown as UserInput;
}

function cn(...a: (string | boolean | undefined | null)[]) {
  return a.filter(Boolean).join(" ");
}

function fmt(val: number, digits = 0) {
  return val.toFixed(digits);
}

// ──────── Form Config ────────
const OPTIONS: Record<string, string[]> = {
  firstPersonIncome: ["15万以下", "15-30万", "30-60万", "60-100万", "100万以上"],
  secondPersonIncome: ["15万以下", "15-30万", "30-60万", "60-100万", "100万以上"],
  incomeStability: [
    "非常稳定（公务员/国企/事业单位）",
    "较稳定（大型企业核心岗）",
    "一般（中小企/绩效占比高）",
    "不稳定（自由职业/创业/销售）",
  ],
  mortgageBalance: ["大于等于100万", "大于等于50万小于100万", "无房贷"],
  otherLoanAmount: ["20万以内", "10-20万", "20-50万", "50万以上", "无其他贷款"],
  bankDeposit: ["5万以下", "5-20万", "20-50万", "50万以上"],
  lowRiskInvestment: ["无", "5万以内", "5-20万", "20-50万", "50万以上"],
  annualExpense: ["5万以下", "5-10万", "10-20万", "20-50万", "50万以上"],
  city: ["北上深", "二线城市", "普通地级市", "县城"],
  firstPersonHealthIns: ["社保医保", "百万医疗", "中端医疗", "高端医疗", "无"],
  secondPersonHealthIns: ["社保医保", "百万医疗", "中端医疗", "高端医疗", "无"],
  childHealthIns: ["社保医保", "百万医疗", "中端医疗", "高端医疗", "无"],
  parentHealthIns: ["社保医保", "百万医疗", "中端医疗", "高端医疗", "无"],
  childParentLifeIns: ["都不需要", "仅子女", "仅父母", "都需要"],
  firstPersonLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  secondPersonLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  childLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  parentLifeCoverage: ["无", "30万以内", "30-50万", "50万以内", "50-100万", "100-200万", "200万以上", "不清楚"],
  firstPersonLifeTerm: ["65岁", "63岁", "70岁", "终身"],
  secondPersonLifeTerm: ["65岁", "63岁", "70岁", "终身"],
};

interface Field {
  key: string;
  label: string;
  type: "select" | "number";
  options?: string[];
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  w?: string;
}

interface Section {
  title: string;
  desc?: string;
  fields: Field[][];
}

const SECTIONS: Section[] = [
  {
    title: "家庭信息",
    desc: "输入您家庭的基本成员信息",
    fields: [
      [
        { key: "firstPersonAge", label: "第一经济支柱 年龄", type: "number", unit: "岁", min: 20, max: 70 },
        { key: "secondPersonAge", label: "第二经济支柱 年龄", type: "number", unit: "岁", min: 20, max: 70 },
        { key: "firstPersonIncome", label: "第一经济支柱 年收入", type: "select" },
        { key: "secondPersonIncome", label: "第二经济支柱 年收入", type: "select" },
      ],
      [
        { key: "incomeStability", label: "家庭收入稳定性", type: "select", w: "md:col-span-2" },
        { key: "childCount", label: "子女人数", type: "number", min: 0, max: 10 },
        { key: "parentSupportCount", label: "赡养父母人数", type: "number", min: 0, max: 6 },
      ],
      [
        { key: "childAge", label: "最小子女年龄", type: "number", unit: "岁", min: 0, max: 22 },
      ],
    ],
  },
  {
    title: "财务状况",
    desc: "输入家庭资产负债与支出情况",
    fields: [
      [
        { key: "mortgageBalance", label: "房贷余额", type: "select" },
        { key: "otherLoanAmount", label: "其他贷款合计", type: "select" },
        { key: "bankDeposit", label: "银行存款", type: "select" },
        { key: "lowRiskInvestment", label: "低风险理财", type: "select" },
      ],
      [
        { key: "annualExpense", label: "年度刚性开销", type: "select" },
        { key: "city", label: "居住城市", type: "select" },
      ],
    ],
  },
  {
    title: "健康险",
    desc: "当前健康保险持有情况与预算",
    fields: [
      [
        { key: "firstPersonHealthIns", label: "第一经济支柱", type: "select" },
        { key: "secondPersonHealthIns", label: "第二经济支柱", type: "select" },
        { key: "childHealthIns", label: "子女", type: "select" },
        { key: "parentHealthIns", label: "父母", type: "select" },
      ],
      [
        { key: "firstPersonCIExisting", label: "第一支柱—已有重疾险", type: "number", unit: "万元", min: 0 },
        { key: "secondPersonCIExisting", label: "第二支柱—已有重疾险", type: "number", unit: "万元", min: 0 },
        { key: "childCIExisting", label: "子女—已有重疾险", type: "number", unit: "万元", min: 0 },
        { key: "parentCIExisting", label: "父母—已有重疾险", type: "number", unit: "万元", min: 0 },
      ],
      [
        { key: "firstPersonMIExisting", label: "第一支柱—已有医疗险", type: "number", unit: "万元", min: 0 },
        { key: "secondPersonMIExisting", label: "第二支柱—已有医疗险", type: "number", unit: "万元", min: 0 },
      ],
      [
        { key: "firstPersonCIPremiumBudget", label: "第一支柱重疾预算", type: "number", unit: "万元/年", min: 0, step: 0.1 },
        { key: "secondPersonCIPremiumBudget", label: "第二支柱重疾预算", type: "number", unit: "万元/年", min: 0, step: 0.1 },
        { key: "firstPersonMIPremiumBudget", label: "第一支柱医疗预算", type: "number", unit: "万元/年", min: 0, step: 0.1 },
        { key: "secondPersonMIPremiumBudget", label: "第二支柱医疗预算", type: "number", unit: "万元/年", min: 0, step: 0.1 },
      ],
    ],
  },
  {
    title: "寿险",
    desc: "寿险持有现状与配置偏好",
    fields: [
      [
        { key: "childParentLifeIns", label: "子女/父母配寿险", type: "select" },
        { key: "firstPersonLifeCoverage", label: "第一支柱已有保额", type: "select" },
        { key: "secondPersonLifeCoverage", label: "第二支柱已有保额", type: "select" },
      ],
      [
        { key: "firstPersonLifeTerm", label: "第一支柱保障期限", type: "select" },
        { key: "secondPersonLifeTerm", label: "第二支柱保障期限", type: "select" },
        { key: "firstPersonLifeBudget", label: "第一支柱年度预算", type: "number", unit: "元", min: 0 },
        { key: "secondPersonLifeBudget", label: "第二支柱年度预算", type: "number", unit: "元", min: 0 },
      ],
    ],
  },
  {
    title: "养老金",
    desc: "退休目标与现有储备",
    fields: [
      [
        { key: "firstPersonRetireAge", label: "第一支柱退休年龄", type: "number", unit: "岁", min: 50, max: 70 },
        { key: "secondPersonRetireAge", label: "第二支柱退休年龄", type: "number", unit: "岁", min: 50, max: 70 },
        { key: "firstPersonRetireYears", label: "第一支柱退休生活年限", type: "number", unit: "年", min: 5, max: 40 },
        { key: "secondPersonRetireYears", label: "第二支柱退休生活年限", type: "number", unit: "年", min: 5, max: 40 },
      ],
      [
        { key: "firstPersonRetireGoal", label: "第一支柱年生活目标", type: "number", unit: "万元", min: 0, step: 0.5 },
        { key: "secondPersonRetireGoal", label: "第二支柱年生活目标", type: "number", unit: "万元", min: 0, step: 0.5 },
      ],
      [
        { key: "firstPersonPensionFund", label: "第一支柱养老专款", type: "number", unit: "元", min: 0 },
        { key: "secondPersonPensionFund", label: "第二支柱养老专款", type: "number", unit: "元", min: 0 },
        { key: "firstPersonComPension", label: "第一支柱商业养老金", type: "number", unit: "元", min: 0 },
        { key: "secondPersonComPension", label: "第二支柱商业养老金", type: "number", unit: "元", min: 0 },
      ],
      [
        { key: "firstPersonPersonalPension", label: "第一支柱个人养老金", type: "number", unit: "元", min: 0 },
        { key: "secondPersonPersonalPension", label: "第二支柱个人养老金", type: "number", unit: "元", min: 0 },
        { key: "firstPersonSocialPension", label: "第一支柱社保养老年金", type: "number", unit: "元/月", min: 0 },
        { key: "secondPersonSocialPension", label: "第二支柱社保养老年金", type: "number", unit: "元/月", min: 0 },
      ],
      [
        { key: "firstPersonPayYears", label: "第一支柱缴费年限", type: "number", unit: "年", min: 0, max: 40 },
        { key: "secondPersonPayYears", label: "第二支柱缴费年限", type: "number", unit: "年", min: 0, max: 40 },
        { key: "firstPersonPensionBudget", label: "第一支柱年预算", type: "number", unit: "元", min: 0 },
        { key: "secondPersonPensionBudget", label: "第二支柱年预算", type: "number", unit: "元", min: 0 },
      ],
    ],
  },
];

// ──────── Animated Number ────────
function AnimatedNumber({ value, suffix = "", decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(value);
  const raf = useRef<number>(0);

  useEffect(() => {
    let start = display;
    const diff = value - start;
    const duration = 600;
    const t0 = performance.now();

    function step(now: number) {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(start + diff * eased);
      if (p < 1) raf.current = requestAnimationFrame(step);
    }

    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{fmt(display, decimals)}{suffix}</>;
}

// ──────── Components ────────

function StatCard({ label, value, trend, delay = 0 }: { label: string; value: string; trend?: "good" | "bad" | "neutral"; delay?: number }) {
  const tc = { good: "text-emerald-600", bad: "text-rose-500", neutral: "text-amber-500" };
  return (
    <motion.div
      variants={fadeUp}
      className="bg-white rounded-xl border border-[#e5e5e5] p-5 card-hover"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-[11px] font-medium text-[#a3a3a3] tracking-wider uppercase mb-1.5">{label}</div>
      <div className={cn("text-[26px] font-bold tracking-tight", trend ? tc[trend] : "text-[#171717]")}>{value}</div>
    </motion.div>
  );
}

function PersonResultCard({
  title, result, color, delay = 0,
}: {
  title: string;
  result: Record<string, unknown>;
  color: string;
  delay?: number;
}) {
  const [tab, setTab] = useState<"health" | "life" | "pension">("health");
  const tabs = [
    { key: "health" as const, label: "健康险" },
    { key: "life" as const, label: "寿险" },
    { key: "pension" as const, label: "养老金" },
  ];

  const R = ({ label, val, trend }: { label: string; val: string; trend?: "good" | "bad" | "neutral" }) => {
    const tc = { good: "text-emerald-600", bad: "text-rose-500", neutral: "text-amber-500" };
    return (
      <div className="flex justify-between items-center py-2 border-b border-[#f0f0f0] last:border-0">
        <span className="text-sm text-[#737373]">{label}</span>
        <span className={cn("text-sm font-semibold", trend ? tc[trend] : "text-[#171717]")}>{val}</span>
      </div>
    );
  };

  const panels: Record<string, React.ReactNode> = {
    health: (
      <div>
        <R label="建议重疾险保额" val={`${fmt(Number(result.recommendedCICoverage))} 万元`} />
        <R label="重疾险缺口" val={`${fmt(Number(result.ciGap))} 万元`} trend={Number(result.ciGap) > 20 ? "bad" : "good"} />
        <R label="建议医疗险类型" val={String(result.recommendedMIType)} />
        <R label="医疗险缺口" val={`${fmt(Number(result.miGap), 1)} 万元`} trend={Number(result.miGap) > 10 ? "bad" : "good"} />
        <R label="重疾险年保费" val={`${fmt(Number(result.estimatedCIPremium), 2)} 万元`} />
        <R label="预算检验" val={String(result.healthBudgetResult)} trend={String(result.healthBudgetResult).includes("✅") ? "good" : "bad"} />
      </div>
    ),
    life: (
      <div>
        <R label="建议寿险保额" val={`${fmt(Number(result.recommendedLifeCoverage))} 万元`} />
        <R label="寿险缺口" val={`${fmt(Number(result.lifeGap))} 万元`} trend={Number(result.lifeGap) > 50 ? "bad" : "good"} />
        <R label="预估年保费" val={`${fmt(Number(result.estimatedLifePremium))} 元`} />
        <R label="预算检验" val={String(result.lifeBudgetResult)} trend={String(result.lifeBudgetResult).includes("✅") ? "good" : "bad"} />
        <R label="配置建议" val={String(result.lifeTermSuggestion)} />
      </div>
    ),
    pension: (
      <div>
        <R label="建议年补充养老金" val={`${fmt(Number(result.recommendedPensionAnnual))} 元`} />
        <R label="养老金缺口" val={`${fmt(Number(result.pensionGap))} 元`} trend={Number(result.pensionGap) > 50 ? "bad" : "good"} />
        <R label="已有储备终值" val={`${fmt(Number(result.existingPensionFV))} 元`} />
        <R label="缴费年限" val={`${fmt(Number(result.payYears))} 年`} />
        <R label="预算检验" val={String(result.pensionBudgetResult)} trend={String(result.pensionBudgetResult).includes("✅") ? "good" : "bad"} />
      </div>
    ),
  };

  return (
    <motion.div variants={fadeUp} className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden">
      <div style={{ background: `linear-gradient(135deg, ${color}06, transparent)` }} className="px-5 pt-5 pb-0">
        <h3 className="text-[15px] font-semibold text-[#171717]">{title}</h3>
        <div className="flex gap-1 mt-3 p-0.5 bg-[#f5f5f5] rounded-lg">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                tab === t.key ? "bg-white shadow-sm text-[#171717]" : "text-[#a3a3a3] hover:text-[#525252]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 py-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            {panels[tab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ──────── Main Page ────────
export default function Home() {
  const [input, setInput] = useState<UserInput>(defaultInput);
  const [expand, setExpand] = useState<Record<string, boolean>>({
    "家庭信息": true,
    "财务状况": true,
    "健康险": false,
    "寿险": false,
    "养老金": false,
  });

  const result = useMemo<InsuranceResult>(() => calculate(input), [input]);
  const handle = useCallback((k: string, v: unknown) => setInput((p) => setNested(p, k, v)), []);

  const gapData = useMemo(() => [
    { name: "第一支柱", 重疾险缺口: result.firstPerson.ciGap, 医疗险缺口: result.firstPerson.miGap, 寿险缺口: result.firstPerson.lifeGap },
    { name: "第二支柱", 重疾险缺口: result.secondPerson.ciGap, 医疗险缺口: result.secondPerson.miGap, 寿险缺口: result.secondPerson.lifeGap },
  ], [result]);

  const pieData = useMemo(() => {
    const items = [
      { name: "重疾险保费", value: Math.round((result.firstPerson.estimatedCIPremium + result.secondPerson.estimatedCIPremium) * 100) / 100 },
      { name: "医疗险保费", value: Math.round((result.firstPerson.estimatedMIPremium + result.secondPerson.estimatedMIPremium) * 100) / 100 },
    ];
    return items.filter((i) => i.value > 0);
  }, [result]);

  return (
    <div className="min-h-screen bg-[#f8f7f4]">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-white/70 glass border-b border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0d9488] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-[#171717]">家庭保险配置决策工具</span>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="max-w-5xl mx-auto px-5 pt-12 pb-8">
        <motion.div {...fadeUp}>
          <h1 className="text-[28px] md:text-[36px] font-bold tracking-tight text-[#171717] leading-tight">
            您的家庭保险配置方案
          </h1>
          <p className="text-[#737373] text-sm mt-2 max-w-lg">
            填写家庭信息，系统将基于精算模型自动测算保障缺口，生成个性化配置建议。
          </p>
        </motion.div>
      </section>

      {/* ─── Input Form ─── */}
      <section className="max-w-5xl mx-auto px-5 pb-8 space-y-3">
        {SECTIONS.map((sec) => {
          const open = expand[sec.title] ?? false;
          return (
            <motion.div
              key={sec.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-[#e5e5e5] overflow-hidden"
            >
              <button
                onClick={() => setExpand((p) => ({ ...p, [sec.title]: !p[sec.title] }))}
                className="w-full flex items-center justify-between px-5 py-3.5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[#171717]">{sec.title}</span>
                  {sec.desc && <span className="hidden sm:block text-[11px] text-[#a3a3a3]">— {sec.desc}</span>}
                </div>
                <motion.svg
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-4 h-4 text-[#a3a3a3]"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 border-t border-[#f0f0f0]">
                      {sec.fields.map((row, ri) => (
                        <div key={ri} className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", ri > 0 && "mt-4")}>
                          {row.map((f) => (
                            <div key={f.key} className={cn("space-y-1", f.w || "")}>
                              <label className="text-[11px] font-medium text-[#737373] tracking-wide">{f.label}</label>
                              {f.type === "select" ? (
                                <select
                                  value={String((input as unknown as Record<string, unknown>)[f.key] ?? "")}
                                  onChange={(e) => handle(f.key, e.target.value)}
                                  className="w-full text-sm h-9 px-3 rounded-lg border border-[#e5e5e5] bg-white focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none transition-all duration-150 text-[#171717]"
                                >
                                  {(OPTIONS[f.key] || []).map((o) => (
                                    <option key={o} value={o}>{o}</option>
                                  ))}
                                </select>
                              ) : (
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={Number((input as unknown as Record<string, unknown>)[f.key] ?? 0)}
                                    onChange={(e) => handle(f.key, Number(e.target.value))}
                                    min={f.min} max={f.max} step={f.step}
                                    className="w-full text-sm h-9 px-3 rounded-lg border border-[#e5e5e5] bg-white focus:border-[#0d9488] focus:ring-2 focus:ring-[#0d9488]/10 outline-none transition-all duration-150 text-[#171717]"
                                  />
                                  {f.unit && (
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#a3a3a3] pointer-events-none">
                                      {f.unit}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </section>

      {/* ─── Results ─── */}
      <section className="max-w-5xl mx-auto px-5 pb-12">
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="总保障缺口" value={`${result.totalGap.toFixed(0)} 万元`} trend={result.totalGap > 100 ? "bad" : result.totalGap > 30 ? "neutral" : "good"} />
            <StatCard label="健康险缺口" value={`${result.totalHealthGap.toFixed(0)} 万元`} trend={result.totalHealthGap > 50 ? "bad" : "good"} />
            <StatCard label="寿险缺口" value={`${result.totalLifeGap.toFixed(0)} 万元`} trend={result.totalLifeGap > 50 ? "bad" : "good"} />
            <StatCard label="风险等级" value={result.riskLevel} trend={result.riskLevel === "低风险" ? "good" : result.riskLevel === "中等风险" ? "neutral" : "bad"} />
          </div>

          {/* Priority */}
          <motion.div variants={fadeUp} className="bg-white rounded-xl border border-[#e5e5e5] p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#ccfbf1] flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[#0d9488]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#171717]">配置优先级</div>
              <div className="text-sm text-[#737373] mt-0.5">{result.priority}</div>
            </div>
          </motion.div>

          {/* Charts */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
              <h3 className="text-[13px] font-semibold text-[#171717] mb-4">保障缺口概览</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gapData} barSize={28} barGap={4}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#737373" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#a3a3a3" }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                    />
                    <Bar dataKey="重疾险缺口" fill={colors.blue} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="医疗险缺口" fill={colors.emerald} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="寿险缺口" fill={colors.amber} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#e5e5e5] p-5">
              <h3 className="text-[13px] font-semibold text-[#171717] mb-4">建议保费结构</h3>
              <div className="h-64 flex items-center justify-center">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-sm text-[#a3a3a3]">暂无数据</span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Person Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PersonResultCard title="第一经济支柱" result={result.firstPerson as unknown as Record<string, unknown>} color="#0d9488" />
            <PersonResultCard title="第二经济支柱" result={result.secondPerson as unknown as Record<string, unknown>} color="#2563eb" />
          </div>

          {/* Child & Parent */}
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "子女配置建议", color: "#a855f7",
                items: [
                  { l: "建议重疾险保额", v: `${result.child.recommendedCICoverage} 万元` },
                  { l: "重疾险缺口", v: `${result.child.ciGap} 万元`, t: result.child.ciGap > 0 ? ("bad" as const) : ("good" as const) },
                  { l: "建议医疗险类型", v: result.child.recommendedMIType },
                  { l: "建议意外险保额", v: `${result.child.recommendedAccidentCoverage} 万元` },
                  { l: "配置优先级", v: result.child.priority },
                  { l: "寿险建议", v: result.child.lifeConclusion },
                  { l: "养老金建议", v: result.child.pensionBudgetResult },
                ],
              },
              {
                title: "父母配置建议", color: "#f59e0b",
                items: [
                  { l: "建议重疾险保额", v: `${result.parent.recommendedCICoverage} 万元` },
                  { l: "重疾险缺口", v: `${result.parent.ciGap} 万元`, t: result.parent.ciGap > 0 ? ("bad" as const) : ("good" as const) },
                  { l: "建议医疗险类型", v: result.parent.recommendedMIType },
                  { l: "建议意外险保额", v: result.parent.recommendedAccidentCoverage },
                  { l: "配置优先级", v: result.parent.priority },
                  { l: "寿险建议", v: result.parent.lifeConclusion },
                  { l: "养老金建议", v: result.parent.pensionBudgetResult },
                ],
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-xl border border-[#e5e5e5] p-5">
                <h3 className="text-[15px] font-semibold text-[#171717] mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: `${card.color}15` }}>
                    <svg className="w-3.5 h-3.5" style={{ color: card.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" />
                    </svg>
                  </span>
                  {card.title}
                </h3>
                <div>
                  {card.items.map((item) => (
                    <div key={item.l} className="flex justify-between items-center py-2 border-b border-[#f0f0f0] last:border-0">
                      <span className="text-sm text-[#737373]">{item.l}</span>
                      <span className={cn("text-sm font-semibold", item.t === "bad" ? "text-rose-500" : item.t === "good" ? "text-emerald-600" : "text-[#171717]")}>{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#e5e5e5]">
        <div className="max-w-5xl mx-auto px-5 py-6 text-center">
          <p className="text-[11px] text-[#a3a3a3]">基于 Excel 精算模型 · 仅供参考，不构成保险购买建议</p>
        </div>
      </footer>
    </div>
  );
}
