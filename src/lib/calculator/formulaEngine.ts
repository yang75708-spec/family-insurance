import { Excel, getJobStabilityFactor, getLiquidAsset, getHealthStatusCoeff } from './excelEngine';
import { UserInput, InsuranceResult } from './types';

// ====== 养老金区间 → 中位值映射 ======
const RETIRE_AGE_MAP: Record<string, number> = { '55-59岁': 57, '60-64岁': 62, '65-69岁': 67, '70岁以上': 72 };
const RETIRE_YEARS_MAP: Record<string, number> = { '10年以下': 5, '10-19年': 15, '20-29年': 25, '30年以上': 35 };
const RETIRE_GOAL_MAP: Record<string, number> = { '5万以下': 3, '5-10万': 8, '10-20万': 15, '20-30万': 25, '30万以上': 35 };
const PENSION_FUND_MAP: Record<string, number> = { '无': 0, '5万以下': 2, '5-20万': 12, '20-50万': 35, '50万以上': 60 };
const SOCIAL_PENSION_MAP: Record<string, number> = { '0.2万以下': 0.1, '0.2-0.5万': 0.35, '0.5-1万': 0.75, '1万以上': 1.2 };
const PAY_YEARS_MAP: Record<string, number> = { '10年': 10, '15年': 15, '20年': 20, '30年': 30 };
const PENSION_BUDGET_MAP: Record<string, number> = { '1万以下': 0.5, '1-3万': 2, '3-5万': 4, '5-10万': 7, '10万以上': 12 };

function resolve(map: Record<string, number>, val: string, fallback: number): number {
  return val !== undefined && val in map ? map[val] : fallback;
}

// ====== 医疗险推荐层级 ======
const MI_TIERS = [
  { id: '社保医保', coverage: 8, premium: 0, label: '社保医保', maxAge: 99 },
  { id: '惠民保', coverage: 15, premium: 0.008, label: '惠民保', maxAge: 99 },
  { id: '百万医疗', coverage: 80, premium: 0.05, label: '百万医疗', maxAge: 60 },
  { id: '中端医疗', coverage: 150, minIncome: 15, premium: 0.4, label: '中端医疗', maxAge: 65 },
  { id: '高端医疗', coverage: 300, minIncome: 45, premium: 2, label: '高端医疗', maxAge: 70 },
] as const;

function getCurrentTierIdx(hasSocial: boolean, hasHuimin: boolean, hasBaiwan: boolean, hasZhongduan: boolean, hasGaoduan: boolean): number {
  if (hasGaoduan) return 4;
  if (hasZhongduan) return 3;
  if (hasBaiwan) return 2;
  if (hasHuimin) return 1;
  return 0;
}

/**
 * 医疗险推荐：收入定级 + 缺口驱动 + 预算检验
 *
 * 决策树：
 *   已覆盖 → "已配置完善"
 *   无商业险 → 百万医疗基础保障
 *   有缺口 → 找最低够用层级
 *     ├─ 收入达标 → 预算够升级一级？→ 升级询问 / 直接推荐
 *     └─ 收入不达标 → 预算够最低够用？→ 直接推荐 / 预算内最高保额
 */
function recommendMIPlan(
  hasSocial: boolean, hasHuimin: boolean, hasBaiwan: boolean,
  hasZhongduan: boolean, hasGaoduan: boolean,
  medicalCost: number,
  miGap: number,
  budget: number,
  householdIncome: number,
  age: number,
  isParent: boolean,
): { type: string; reason: string } {
  const currentIdx = getCurrentTierIdx(hasSocial, hasHuimin, hasBaiwan, hasZhongduan, hasGaoduan);
  const fmt = (n: number) => n.toFixed(3).replace(/\.?0+$/, '');

  // 1. 已有足够商业险覆盖
  if (miGap <= 0 && (hasBaiwan || hasZhongduan || hasGaoduan)) {
    return { type: '已配置完善', reason: `已有${MI_TIERS[currentIdx].label}，保障已覆盖当前医疗缺口` };
  }

  // 2. 无商业险（仅社保医保或惠民保）→ 基础保障（根据年龄选择百万医疗或惠民保）
  if (!hasBaiwan && !hasZhongduan && !hasGaoduan) {
    const canBaiwan = age <= 60;
    if (isParent) {
      return {
        type: canBaiwan ? '百万医疗' : '惠民保',
        reason: canBaiwan
          ? '建议为父母配置百万医疗（保额80万），如因健康问题无法投保，可考虑防癌医疗险或惠民保'
          : '父母年龄已超百万医疗投保上限，建议配置惠民保作为基础保障',
      };
    }
    if (!canBaiwan) {
      return { type: '惠民保', reason: '您的年龄已超百万医疗投保上限，建议配置惠民保作为基础保障，年保费约0.008万元' };
    }
    return { type: '百万医疗', reason: '建议配置百万医疗作为基础保障，年保费约0.05万元' };
  }

  // 3. 有缺口 → 找最低够用层级
  let minSufficientIdx = -1;
  for (let i = currentIdx + 1; i < MI_TIERS.length; i++) {
    if (age > MI_TIERS[i].maxAge) continue;
    if (MI_TIERS[i].coverage >= medicalCost) { minSufficientIdx = i; break; }
  }
  if (minSufficientIdx === -1) {
    // 无年龄合适且保额足够的层级，取最后一个年龄合适的
    for (let i = currentIdx + 1; i < MI_TIERS.length; i++) {
      if (age <= MI_TIERS[i].maxAge) minSufficientIdx = i;
    }
  }

  const recIdx = Math.max(minSufficientIdx, currentIdx + 1);
  const recTier = MI_TIERS[recIdx];

  // 收入是否达标该层级（minIncome 仅中端/高端医疗有要求）
  const minIncomeRequired = 'minIncome' in recTier ? recTier.minIncome : 0;
  const incomeQualified = householdIncome >= minIncomeRequired;

  if (incomeQualified) {
    // 收入达标 → 看预算能否升级
    const upgradeIdx = recIdx + 1;
    if (upgradeIdx < MI_TIERS.length && age <= MI_TIERS[upgradeIdx].maxAge && budget >= MI_TIERS[upgradeIdx].premium) {
      const upgradeTier = MI_TIERS[upgradeIdx];
      const alt = isParent ? '如因健康问题无法投保，可考虑防癌医疗险。' : '';
      return {
        type: recTier.id,
        reason: `${recTier.label}（${recTier.coverage}万保额）已能覆盖您的保障缺口。${alt}预算充足，是否考虑升级至${upgradeTier.label}？（年保费约${fmt(upgradeTier.premium)}万元）`,
      };
    }
    // 预算不够升级 → 直接推荐
    const alt = isParent && recTier.id === '百万医疗'
      ? '，如因健康问题无法投保，可考虑防癌医疗险或惠民保'
      : '';
    return {
      type: recTier.id,
      reason: `推荐${recTier.label}（保额${recTier.coverage}万），年保费约${fmt(recTier.premium)}万元${alt}`,
    };
  } else {
    // 收入不达标（不提示收入）
    if (budget >= recTier.premium) {
      return {
        type: recTier.id,
        reason: `推荐${recTier.label}（保额${recTier.coverage}万），年保费约${fmt(recTier.premium)}万元`,
      };
    }
    // 预算也不够 → 预算内最高保额方案
    let bestIdx = currentIdx;
    for (let i = currentIdx + 1; i < MI_TIERS.length; i++) {
      if (age > MI_TIERS[i].maxAge) continue;
      if (budget >= MI_TIERS[i].premium) bestIdx = i;
      else break;
    }
    if (bestIdx <= currentIdx) {
      return {
        type: MI_TIERS[currentIdx].id,
        reason: `当前预算${fmt(budget)}万元范围内暂无更高级别方案，建议维持${MI_TIERS[currentIdx].label}`,
      };
    }
    const bestTier = MI_TIERS[bestIdx];
    return {
      type: bestTier.id,
      reason: `当前预算${fmt(budget)}万元，建议配置${bestTier.label}（保额${bestTier.coverage}万），可覆盖大部分医疗缺口`,
    };
  }
}

/**
 * 根据健康险勾选计算已有有效医疗保额
 * 各险种在大陆市场的典型有效保额（万元）
 */
function getEffectiveCoverageFromCheckboxes(
  hasSocial: boolean, hasHuimin: boolean, hasBaiwan: boolean,
  hasZhongduan: boolean, hasGaoduan: boolean
): number {
  let coverage = 0;
  if (hasGaoduan) coverage = Math.max(coverage, 300);
  if (hasZhongduan) coverage = Math.max(coverage, 150);
  if (hasBaiwan) coverage = Math.max(coverage, 80);
  if (hasHuimin) coverage = Math.max(coverage, 15);
  if (hasSocial) coverage = Math.max(coverage, 8);
  return coverage;
}

/**
 * 根据年龄、收入水平、推荐医疗险类型估算医疗险年保费（万元）
 */
function estimateMIPremium(age: number, income: string, recType: string): number {
  // 年龄系数
  const ageFactor = age < 30 ? 1 : age < 40 ? 1.2 : age < 50 ? 1.6 : age < 60 ? 2.5 : 4;
  // 收入系数
  const incomeVal = Excel.getIncome(income);
  const incomeFactor = incomeVal < 22.5 ? 1 : incomeVal < 80 ? 1.1 : incomeVal < 200 ? 1.3 : 1.6;
  // 各险种基准保费（万元/年，30岁左右）
  let base: number;
  if (recType.includes('高端医疗')) base = 1.5;
  else if (recType.includes('中端医疗')) base = 0.4;
  else if (recType.includes('百万医疗')) base = 0.05;
  else if (recType.includes('惠民保')) base = 0.03;
  else base = 0.03;

  return Math.round(base * ageFactor * incomeFactor * 100) / 100;
}

/**
 * 根据子女年龄、城市、家庭收入计算建议重疾险保额（万元）
 * 行业标准：治疗成本 + 父母收入损失补偿
 */
function computeChildCIRecommendation(
  childAge: number, city: string,
  income1: number, income2: number
): number {
  // 城市基额（万元）
  const cityBase = city === '北上广深' ? 65
    : city === '二线城市' ? 50
    : city === '普通地级市' ? 40 : 35;
  // 家庭收入系数（以家庭均值 45万 为基准 1.0）
  const familyAvg = (income1 + income2) / 2;
  const incomeFactor = Math.max(0.7, Math.min(2, familyAvg / 45));
  // 年龄系数（越小需保障越久）
  const ageFactor = childAge <= 1 ? 1.2
    : childAge <= 6 ? 1.0
    : childAge <= 12 ? 0.9 : 0.8;
  // 如果有多个子女，分摊保额
  return Math.max(20, Math.min(100, Math.round(cityBase * incomeFactor * ageFactor)));
}

// ====== 寿险费率表（万元保费/万元保额） ======
const LIFE_RATES: [number, number, number, number][] = [
  [20, 30, 0.0008, 0.0005],
  [30, 40, 0.0012, 0.0008],
  [40, 50, 0.0025, 0.0015],
  [50, 60, 0.0045, 0.0035],
  [60, 70, 0.0090, 0.0065],
];
function getLifeRate(age: number, gender: string): number {
  for (const [min, max, male, female] of LIFE_RATES) {
    if (age >= min && age < max) return gender === '男性' ? male : female;
  }
  return 0.0090;
}

// ====== 重疾险费率表（年费率，万元保费/万元保额） ======
const CI_RATES: [number, number, number, number][] = [
  [20, 30, 0.015, 0.012],
  [30, 40, 0.025, 0.020],
  [40, 50, 0.040, 0.035],
  [50, 60, 0.065, 0.055],
  [60, 70, 0.090, 0.080],
];
function getCIRate(age: number, gender: string): number {
  for (const [min, max, male, female] of CI_RATES) {
    if (age >= min && age < max) return gender === '男性' ? male : female;
  }
  return 0.090;
}

const HEALTH_COEFF: Record<string, number> = { '优': 1.0, '良': 1.5, '差': 2.0 };

const CAREER_RISK_MAP: Record<string, number> = {
  '非常稳定（例如：公务员/国企/事业单位）': 0.8,
  '较稳定（例如：大型企业核心岗）': 1.0,
  '一般（例如：中小企/绩效占比高）': 1.2,
  '不稳定（例如：自由职业/创业/销售）': 1.5,
};

function getSalaryGrowthForLife(age: number): number {
  if (age < 30) return 0.045;
  if (age < 40) return 0.04;
  if (age < 50) return 0.02;
  return 0.005;
}

function getExistingLifeYears(val: string): number {
  switch (val) {
    case '10年以下': return 5;
    case '10-20年': return 15;
    case '20年以上': return 25;
    case '不清楚': return 0;
    default: return 0;
  }
}

function getIncomeRatio(income1: number, income2: number, isFirst: boolean): number {
  const total = income1 + income2;
  if (total === 0) return 0.5;
  return isFirst ? income1 / total : income2 / total;
}

/**
 * 年龄相关的医保目录内费用占比
 * 年龄越大，目录内费用占比越低（老年人用药更多在目录外）
 */
function getAgeCoverageRatio(age: number): number {
  if (age < 30) return 0.60;
  if (age < 45) return 0.50;
  if (age < 60) return 0.40;
  return 0.35;
}

// ====== 新版健康险：期望医疗消费档位 & 重症基础花销 & 家庭系数 ======
/** 网站城市选项 → Excel档位表城市分组 */
function getCityGroup(city: string): string {
  if (city === '北上广深') return '一线';
  if (city === '二线城市') return '新一线';
  if (city === '普通地级市') return '二线';
  return '县城';
}

/** 重症基础花销：一线/新一线 50万，二线及以下 30万 */
function getSevereCost(city: string): number {
  const g = getCityGroup(city);
  return g === '一线' || g === '新一线' ? 50 : 30;
}

/** 期望医疗消费档位（元/年区间中值 → 万元）
 *  档位表来源：修订版Excel「期望医疗消费区间(自选)」4城市×优/良/差×A/B/C
 *  例：一线·优·B档 = (500+1500)/2 = 1000元/年 = 0.10万
 */
const MEDICAL_BRACKETS: Record<string, Record<string, Record<string, number>>> = {
  '一线': {
    '优': { A: 0.025, B: 0.10, C: 0.225 },
    '良': { A: 0.125, B: 0.35, C: 0.75 },
    '差': { A: 0.5, B: 1.4, C: 3.5 },
  },
  '新一线': {
    '优': { A: 0.02, B: 0.08, C: 0.185 },
    '良': { A: 0.095, B: 0.275, C: 0.6 },
    '差': { A: 0.375, B: 1.05, C: 2.75 },
  },
  '二线': {
    '优': { A: 0.015, B: 0.065, C: 0.15 },
    '良': { A: 0.075, B: 0.21, C: 0.45 },
    '差': { A: 0.3, B: 0.85, C: 2.1 },
  },
  '县城': {
    '优': { A: 0.01, B: 0.05, C: 0.115 },
    '良': { A: 0.06, B: 0.175, C: 0.375 },
    '差': { A: 0.24, B: 0.7, C: 1.75 },
  },
};

/** 期望医疗消费：城市 + 身体状况自评(优/良/差) + 档位(A/B/C) → 区间中值(万元)
 *  重症治疗费不入档位，由 getSevereCost 按城市直接计入重疾缺口 */
function getExpectedMedicalCost(city: string, health: string, bracket: string): number {
  const group = getCityGroup(city);
  return MEDICAL_BRACKETS[group]?.[health]?.[bracket] ?? 0.5;
}

/** 家庭系数 α：患重症愿意动用的流动资产比例（保守/稳健/进取，对齐Excel「家庭资产配置参考」） */
const FAMILY_COEFF: Record<string, number> = { '保守': 0.3, '稳健': 0.5, '进取': 0.6 };

/**
 * ========================================
 *  Excel → JavaScript 公式映射引擎
 * ========================================
 *  每个公式标注了对应的 Excel 单元格位置
 *  例如: // H21 = L1*(1-((1+H19)/(1+L3))^L7)/(L3-H19)*H18
 * ========================================
 */
export function calculate(input: UserInput): InsuranceResult {
  // ==================== 用户端 G/H 列：衍生计算 ====================
  // D10 = MAX(0,63-B3)
  const firstRemainingYears = Math.max(0, 63 - input.firstPersonAge);
  // G2 = MAX(0,63-B4)
  const secondRemainingWorkYears = Math.max(0, 63 - input.secondPersonAge);
  // G3 = MAX(0,22-B10)
  const childToGradYears = Math.max(0, 22 - input.childAge);
  // G4 = MIN(D10,G3)
  const firstProtectYears = Math.min(firstRemainingYears, childToGradYears);
  // G5 = MIN(G2,G3)
  const secondProtectYears = Math.min(secondRemainingWorkYears, childToGradYears);
  // G6
  const supportYears = 20;
  // G7
  const inflationRate = 0.03;
  // G8
  const salaryGrowthRate = 0.05;
  // G9
  const discountFactor = 0.8;

  // ==================== L/M 列：参数转化 ====================
  // L1 = SWITCH(B5,...)
  const incomeConversion1 = Excel.getIncome(input.firstPersonIncome);
  // M1 = SWITCH(B6,...)
  const incomeConversion2 = Excel.getIncome(input.secondPersonIncome);
  // L3
  const discountRate = 0.05;
  // L4 = SWITCH(D8,...)
  const expenseConversion = Excel.getExpense(input.annualExpense);
  // L5
  const inflationI = 0.025;
  // 家庭年收入总和
  const totalHouseholdIncome = incomeConversion1 + incomeConversion2;

  // L6 = L1/(L1+M1)
  const incomeRatio1 = (incomeConversion1 + incomeConversion2) === 0
    ? 0.5
    : incomeConversion1 / (incomeConversion1 + incomeConversion2);
  // M6 = 1-L6
  const incomeRatio2 = 1 - incomeRatio1;
  // 退休年龄中位值（养老金使用）
  const retireAge1 = resolve(RETIRE_AGE_MAP, input.firstPersonRetireAge, 62);
  const retireAge2 = resolve(RETIRE_AGE_MAP, input.secondPersonRetireAge, 62);
  // L8 = CHOOSE(MATCH(D6,...),...) + CHOOSE(MATCH(D7,...),...)
  const liquidAsset = getLiquidAsset(input.bankDeposit, input.lowRiskInvestment);

  // ==================== H/I 列：健康险参数（新版公式） ====================
  // H9 = IF(D9="北上广深",80,IF(D9="二线城市",50,IF(D9="普通地级市",30,30)))
  // （子女/父母医疗险推荐仍使用）
  const baseMedicalCost1 = input.city === '北上广深' ? 80
    : input.city === '二线城市' ? 50
    : input.city === '普通地级市' ? 30 : 30;
  const baseMedicalCost2 = baseMedicalCost1;

  // Kjob 收入稳定性系数（非常稳定0.95/较稳定0.85/一般0.70/不稳定0.55）
  const kjob1 = getJobStabilityFactor(input.incomeStability);
  const kjob2 = getJobStabilityFactor(input.incomeStability2);

  // 剩余工作/缴费年限（养老金使用）
  const remainingN1 = retireAge1 - input.firstPersonAge;
  const remainingN2 = retireAge2 - input.secondPersonAge;

  // 收入法 PV_i = income_i × (1-((1+g)/(1+r))^5)/(r-g) × Kjob_i
  // g = 2.8%（全国平均工资增速），r = 2.19%（30年期国债收益率，作为折现率）
  const HEALTH_G = 0.028;
  const HEALTH_R = 0.0219;
  const pvYears = 5;
  const pvFactor = (1 - Math.pow((1 + HEALTH_G) / (1 + HEALTH_R), pvYears)) / (HEALTH_R - HEALTH_G);
  const pvIncome1 = incomeConversion1 * pvFactor * kjob1;
  const pvIncome2 = incomeConversion2 * pvFactor * kjob2;

  // 需求法 PV_i = (债务覆盖 + 子女教育金 + 家庭生活支出) × 收入占比（5年）
  const householdDebt = Excel.getMortgage(input.mortgageBalance) + Excel.getOtherLoan(input.otherLoanAmount);
  const eduYears = Math.min(pvYears, Math.max(0, childToGradYears));
  const needLifeFactor = (1 - Math.pow((1 + inflationI) / (1 + HEALTH_R), pvYears)) / (HEALTH_R - inflationI);
  const needBase = householdDebt + input.childCount * 3 * eduYears + expenseConversion * needLifeFactor;
  const needPV1 = needBase * incomeRatio1;
  const needPV2 = needBase * incomeRatio2;

  // 重症基础花销：一线/新一线 50万，二线及以下 30万
  const severeCost1 = getSevereCost(input.city);
  const severeCost2 = severeCost1;

  // 已有重疾保额 = MAX(手动填写, 勾选重疾险有效保额30万)
  const existingCIEff1 = Math.max(input.firstPersonCIExisting, input.p1_重疾险 ? 30 : 0);
  const existingCIEff2 = Math.max(input.secondPersonCIExisting, input.p2_重疾险 ? 30 : 0);

  // 重疾缺口_i = MAX(0, (收入法PV + 需求法PV)/2 + 重症基础花销 - 已有重疾保额)
  const recCI1 = Math.round(((pvIncome1 + needPV1) / 2 + severeCost1) * 100) / 100;
  const ciGap1 = Math.max(0, Math.round((recCI1 - existingCIEff1) * 100) / 100);
  const recCI2 = Math.round(((pvIncome2 + needPV2) / 2 + severeCost2) * 100) / 100;
  const ciGap2 = Math.max(0, Math.round((recCI2 - existingCIEff2) * 100) / 100);

  // 期望医疗消费_i（城市 + 身体状况自评 + 档位A/B/C/D）
  const expectedMedical1 = getExpectedMedicalCost(input.city, input.firstPersonHealthStatus, input.p1_期望医疗消费档位);
  const expectedMedical2 = getExpectedMedicalCost(input.city, input.secondPersonHealthStatus, input.p2_期望医疗消费档位);

  // 医疗险覆盖_i = MAX(手动医疗保额, 勾选险种有效保额)
  const effCoverage1 = getEffectiveCoverageFromCheckboxes(
    input.p1_社保医保, input.p1_惠民保, input.p1_百万医疗,
    input.p1_中端医疗, input.p1_高端医疗
  );
  const effCoverage2 = getEffectiveCoverageFromCheckboxes(
    input.p2_社保医保, input.p2_惠民保, input.p2_百万医疗,
    input.p2_中端医疗, input.p2_高端医疗
  );
  const medicalCoverageEff1 = Math.max(input.firstPersonMIExisting, effCoverage1);
  const medicalCoverageEff2 = Math.max(input.secondPersonMIExisting, effCoverage2);

  // 医疗缺口_i = MAX(0, 期望医疗消费 - 医疗险覆盖)
  const recMI1 = expectedMedical1;
  const miGap1 = Math.max(0, Math.round((expectedMedical1 - medicalCoverageEff1) * 100) / 100);
  const recMI2 = expectedMedical2;
  const miGap2 = Math.max(0, Math.round((expectedMedical2 - medicalCoverageEff2) * 100) / 100);

  // 家庭系数 α：患重症愿意动用的流动资产比例（保守0.3/稳健0.5/进取0.6）
  const alpha = FAMILY_COEFF[input.familyCoefficient] ?? 0.5;

  // 重疾险费率 + 健康状况系数（保费估算）
  const ciHealthCoeff1 = HEALTH_COEFF[input.firstPersonHealthStatus] ?? 1.0;
  const ciRate1 = getCIRate(input.firstPersonAge, input.firstPersonGender);
  const ciHealthCoeff2 = HEALTH_COEFF[input.secondPersonHealthStatus] ?? 1.0;
  const ciRate2 = getCIRate(input.secondPersonAge, input.secondPersonGender);

  // ==================== 第一经济支柱——健康险输出 ====================
  const ciGapOut1 = ciGap1;
  const miGapOut1 = miGap1;
  // 单支柱健康险总缺口 = 重疾缺口 + 医疗缺口（流动资产×α 在汇总时统一抵扣）
  const totalHealthGap1 = Math.round((ciGapOut1 + miGapOut1) * 100) / 100;

  // D3 = recommendMIPlan（基于期望医疗消费与医疗缺口推荐）
  const { type: recMIType1, reason: miReason1 } = recommendMIPlan(
    input.p1_社保医保, input.p1_惠民保, input.p1_百万医疗,
    input.p1_中端医疗, input.p1_高端医疗,
    expectedMedical1, miGap1,
    input.firstPersonMIPremiumBudget, totalHouseholdIncome, input.firstPersonAge, false
  );
  // D4 = B4 * ciRate1 * ciHealthCoeff1
  const estCIPrem1 = Math.round(ciGapOut1 * ciRate1 * ciHealthCoeff1 * 100) / 100;
  // D5 = estimateMIPremium(年龄, 收入, 推荐类型)
  const estMIPrem1 = estimateMIPremium(input.firstPersonAge, input.firstPersonIncome, recMIType1);
  // D6 = D4 + D5
  const totalHealthPrem1 = Math.round((estCIPrem1 + estMIPrem1) * 100) / 100;
  // D7 = IF(D6 <= (D20+E20), "✅预算充足", "⚠️预算不足")
  const healthBudget1 = totalHealthPrem1 <= (input.firstPersonCIPremiumBudget + input.firstPersonMIPremiumBudget)
    ? '✅预算充足'
    : '⚠️预算不足';

  // ==================== 第一经济支柱——寿险输出（新版公式） ====================
  const mortgageVal1 = Excel.getMortgage(input.mortgageBalance);
  const otherLoanVal1 = Excel.getOtherLoan(input.otherLoanAmount);
  const expenseVal1 = Excel.getExpenseVal(input.annualExpense);
  const depositVal1 = Excel.getDeposit(input.bankDeposit);
  const investVal1 = Excel.getInvestment(input.lowRiskInvestment);
  const existingLife1 = input.firstPersonHasLifeIns
    ? Excel.getLifeCoverage(input.firstPersonLifeCoverage)
    : 0;
  const existLifeYears1 = input.firstPersonHasLifeIns
    ? getExistingLifeYears(input.firstPersonExistingLifeYears)
    : 0;

  // 收入占比
  const lifeIncomeRatio1 = getIncomeRatio(incomeConversion1, incomeConversion2, true);

  // 职业风险系数
  const careerRisk1 = CAREER_RISK_MAP[input.incomeStability] ?? 1.0;

  // 工资增长率（寿险用）
  const salaryGrowthLife1 = getSalaryGrowthForLife(input.firstPersonAge);

  // 支出缺口方案
  const lifeExpenseGap1 = Math.max(0,
    mortgageVal1 * lifeIncomeRatio1
    + otherLoanVal1 * lifeIncomeRatio1
    + expenseVal1 * firstProtectYears * Math.pow(1 + inflationRate, firstProtectYears / 2) * discountFactor * lifeIncomeRatio1
    + input.childCount * 30 * Math.pow(1 + inflationRate, childToGradYears / 2) * discountFactor * lifeIncomeRatio1
    + input.parentSupportCount * 20 * Math.pow(1 + inflationRate, supportYears / 2) * discountFactor * lifeIncomeRatio1
    - (depositVal1 + investVal1) * lifeIncomeRatio1 * (1 + inflationRate)
    - existingLife1 * Math.min(existLifeYears1, firstProtectYears) / Math.max(firstProtectYears, 1)
  );

  // 收入损失方案
  const lifeIncomeGap1 = Math.max(0,
    incomeConversion1 * firstRemainingYears
    * Math.pow(1 + salaryGrowthLife1, firstRemainingYears / 2)
    * discountFactor * careerRisk1
    - existingLife1 * Math.min(existLifeYears1, firstRemainingYears) / Math.max(firstRemainingYears, 1)
  );

  const recLife1 = Math.round(Math.max(lifeExpenseGap1, lifeIncomeGap1) * 100) / 100;
  const existingLifeOut1 = existingLife1;
  const lifeGap1 = Math.max(0, parseFloat((recLife1 - existingLife1).toFixed(2)));

  // 保费（万元）= 费率(万元保费/万元保额) × 缺口(万元) × 健康系数
  const lifeRate1 = getLifeRate(input.firstPersonAge, input.firstPersonGender);
  const healthCoeff1 = HEALTH_COEFF[input.firstPersonHealthStatus] ?? 1.0;
  const estLifePrem1 = Math.round(lifeRate1 * Math.max(0, recLife1 - existingLife1) * healthCoeff1 * 10000) / 10000;

  const lifeBudget1 = estLifePrem1 <= input.firstPersonLifeBudget
    ? '✅ 预算充足'
    : '⚠️ 预算不足，建议降低保额或调整期限';

  // 期限建议
  const lifeTerm1 =
    input.firstPersonLifeTerm === '63岁' ? '推荐配置定期寿险至63岁'
    : input.firstPersonLifeTerm === '65岁' ? '推荐配置定期寿险至65岁'
    : input.firstPersonLifeTerm === '终身' ? '推荐配置终身寿险'
    : input.firstPersonLifeTerm === '房贷还清或子女成年' ? '推荐配置定期寿险至房贷还清或子女成年'
    : '';

  // ==================== 第一经济支柱——养老金输出 ====================
  // H3 = D42*(0.03+1)^(B42-B3)
  const retireGoal1 = resolve(RETIRE_GOAL_MAP, input.firstPersonRetireGoal, 15);
  const retireYears1 = resolve(RETIRE_YEARS_MAP, input.firstPersonRetireYears, 25);
  const pensionFund1 = resolve(PENSION_FUND_MAP, input.firstPersonPensionFund, 2);
  const comPension1 = resolve(PENSION_FUND_MAP, input.firstPersonComPension, 2);
  const personalPension1 = resolve(PENSION_FUND_MAP, input.firstPersonPersonalPension, 2);
  const socialPension1 = resolve(SOCIAL_PENSION_MAP, input.firstPersonSocialPension, 0.35);
  const payYears1 = resolve(PAY_YEARS_MAP, input.firstPersonPayYears, 20);
  const pensionBudget1_val = resolve(PENSION_BUDGET_MAP, input.firstPersonPensionBudget, 2);
  const retireNeedFV1 = retireGoal1 * Math.pow(1 + inflationRate, remainingN1);
  // H4 = PV(0.05, C42, -H3, 0, 1)
  const retireNeedPV1 = Excel.PV(discountRate, retireYears1, -retireNeedFV1, 0, 1);
  // H5 = FV(0.05, B42-B3, 0, -B46, 0) + FV(0.05, B42-B3, 0, -C46, 0) + FV(0.05, B42-B3, 0, -D46, 0) + PV(0.05, C42, -E46*12, 0, 1)
  const existingReserveFV1 =
    Excel.FV(discountRate, remainingN1, 0, -(pensionFund1), 0) +
    Excel.FV(discountRate, remainingN1, 0, -(comPension1), 0) +
    Excel.FV(discountRate, remainingN1, 0, -(personalPension1), 0) +
    Excel.PV(discountRate, retireYears1, -(socialPension1 * 12), 0, 1);
  // H6 = MAX(0, H4 - H5)  — 全部统一为万元
  const retireGap1 = Math.max(0, retireNeedPV1 - existingReserveFV1);

  // B13 = PMT(0.05, B52, 0, H6, 1) * (-1)  — 结果在万元，不低于0
  const recPension1 = Math.max(0, Math.round(-Excel.PMT(discountRate, payYears1, 0, retireGap1, 1) * 100) / 100);
  // B14 = H5
  const existingPensionFV1 = existingReserveFV1;
  // B15 = D42
  const annualRetireGoal1 = retireGoal1;
  // D13 = H6
  const pensionGap1 = Math.round(retireGap1 * 100) / 100;
  // D14 = B52
  // D15 = IF(B13 <= D52, "✅预算充足", "⚠️...")
  const pensionBudget1 = recPension1 <= pensionBudget1_val
    ? '✅预算充足'
    : '⚠️预算不足，请调整比例或延长缴费期';

  // ==================== 第二经济支柱——健康险输出 ====================
  const ciGapOut2 = ciGap2;
  const miGapOut2 = miGap2;
  // 单支柱健康险总缺口 = 重疾缺口 + 医疗缺口（流动资产×α 在汇总时统一抵扣）
  const totalHealthGap2 = Math.round((ciGapOut2 + miGapOut2) * 100) / 100;

  // D18 = recommendMIPlan（基于期望医疗消费与医疗缺口推荐）
  const { type: recMIType2, reason: miReason2 } = recommendMIPlan(
    input.p2_社保医保, input.p2_惠民保, input.p2_百万医疗,
    input.p2_中端医疗, input.p2_高端医疗,
    expectedMedical2, miGap2,
    input.secondPersonMIPremiumBudget, totalHouseholdIncome, input.secondPersonAge, false
  );
  // D19 = B19 * ciRate2 * ciHealthCoeff2
  const estCIPrem2 = Math.round(ciGapOut2 * ciRate2 * ciHealthCoeff2 * 100) / 100;
  // D20 = estimateMIPremium(年龄, 收入, 推荐类型)
  const estMIPrem2 = estimateMIPremium(input.secondPersonAge, input.secondPersonIncome, recMIType2);
  // D21 = D19 + D20
  const totalHealthPrem2 = Math.round((estCIPrem2 + estMIPrem2) * 100) / 100;
  // D22 = IF(D21 <= (D21+E21), ...)
  const healthBudget2 = totalHealthPrem2 <= (input.secondPersonCIPremiumBudget + input.secondPersonMIPremiumBudget)
    ? '✅预算充足'
    : '⚠️预算不足';

  // ==================== 第二经济支柱——寿险输出（新版公式） ====================
  const mortgageVal2 = Excel.getMortgageP2(input.mortgageBalance);
  const otherLoanVal2 = Excel.getOtherLoanP2(input.otherLoanAmount);
  const existingLife2 = input.secondPersonHasLifeIns
    ? Excel.getLifeCoverage(input.secondPersonLifeCoverage)
    : 0;
  const existLifeYears2 = input.secondPersonHasLifeIns
    ? getExistingLifeYears(input.secondPersonExistingLifeYears)
    : 0;

  // 收入占比
  const lifeIncomeRatio2 = getIncomeRatio(incomeConversion1, incomeConversion2, false);

  // 职业风险系数
  const careerRisk2 = CAREER_RISK_MAP[input.incomeStability2] ?? 1.0;

  // 工资增长率（寿险用）
  const salaryGrowthLife2 = getSalaryGrowthForLife(input.secondPersonAge);

  // 支出缺口方案
  const lifeExpenseGap2 = Math.max(0,
    mortgageVal2 * lifeIncomeRatio2
    + otherLoanVal2 * lifeIncomeRatio2
    + expenseVal1 * secondProtectYears * Math.pow(1 + inflationRate, secondProtectYears / 2) * discountFactor * lifeIncomeRatio2
    + input.childCount * 15 * Math.pow(1 + inflationRate, childToGradYears / 2) * discountFactor * lifeIncomeRatio2
    + input.parentSupportCount * 10 * Math.pow(1 + inflationRate, supportYears / 2) * discountFactor * lifeIncomeRatio2
    - (depositVal1 + investVal1) * lifeIncomeRatio2 * (1 + inflationRate)
    - existingLife2 * Math.min(existLifeYears2, secondProtectYears) / Math.max(secondProtectYears, 1)
  );

  // 收入损失方案
  const lifeIncomeGap2 = Math.max(0,
    incomeConversion2 * secondRemainingWorkYears
    * Math.pow(1 + salaryGrowthLife2, secondRemainingWorkYears / 2)
    * discountFactor * careerRisk2
    - existingLife2 * Math.min(existLifeYears2, secondRemainingWorkYears) / Math.max(secondRemainingWorkYears, 1)
  );

  const recLife2 = Math.round(Math.max(lifeExpenseGap2, lifeIncomeGap2) * 100) / 100;
  const existingLifeOut2 = existingLife2;
  const lifeGap2 = Math.max(0, parseFloat((recLife2 - existingLife2).toFixed(2)));

  // 保费（万元）= 费率 × 缺口 × 健康系数
  const lifeRate2 = getLifeRate(input.secondPersonAge, input.secondPersonGender);
  const healthCoeff2 = HEALTH_COEFF[input.secondPersonHealthStatus] ?? 1.0;
  const estLifePrem2 = Math.round(lifeRate2 * Math.max(0, recLife2 - existingLife2) * healthCoeff2 * 10000) / 10000;

  const lifeBudget2 = estLifePrem2 <= input.secondPersonLifeBudget
    ? '✅ 预算充足'
    : '⚠️ 预算不足，建议降低保额或调整期限';

  // 期限建议
  const lifeTerm2 =
    input.secondPersonLifeTerm === '63岁' ? '推荐配置定期寿险至63岁'
    : input.secondPersonLifeTerm === '65岁' ? '推荐配置定期寿险至65岁'
    : input.secondPersonLifeTerm === '终身' ? '推荐配置终身寿险'
    : input.secondPersonLifeTerm === '房贷还清或子女成年' ? '推荐配置定期寿险至房贷还清或子女成年'
    : '';

  // ==================== 第二经济支柱——养老金输出 ====================
  const retireGoal2 = resolve(RETIRE_GOAL_MAP, input.secondPersonRetireGoal, 8);
  const retireYears2 = resolve(RETIRE_YEARS_MAP, input.secondPersonRetireYears, 25);
  const pensionFund2 = resolve(PENSION_FUND_MAP, input.secondPersonPensionFund, 2);
  const comPension2 = resolve(PENSION_FUND_MAP, input.secondPersonComPension, 2);
  const personalPension2 = resolve(PENSION_FUND_MAP, input.secondPersonPersonalPension, 2);
  const socialPension2 = resolve(SOCIAL_PENSION_MAP, input.secondPersonSocialPension, 0.35);
  const payYears2 = resolve(PAY_YEARS_MAP, input.secondPersonPayYears, 10);
  const pensionBudget2_val = resolve(PENSION_BUDGET_MAP, input.secondPersonPensionBudget, 0.5);
  const retireNeedFV2 = retireGoal2 * Math.pow(1 + inflationRate, remainingN2);
  const retireNeedPV2 = Excel.PV(discountRate, retireYears2, -retireNeedFV2, 0, 1);
  const existingReserveFV2 =
    Excel.FV(discountRate, remainingN2, 0, -(pensionFund2), 0) +
    Excel.FV(discountRate, remainingN2, 0, -(comPension2), 0) +
    Excel.FV(discountRate, remainingN2, 0, -(personalPension2), 0) +
    Excel.PV(discountRate, retireYears2, -(socialPension2 * 12), 0, 1);
  const retireGap2 = Math.max(0, retireNeedPV2 - existingReserveFV2);

  const recPension2 = payYears2 > 0
    ? Math.max(0, Math.round(-Excel.PMT(discountRate, payYears2, 0, retireGap2, 1) * 100) / 100)
    : 0;
  const existingPensionFV2 = existingReserveFV2;
  const annualRetireGoal2 = retireGoal2;
  const pensionGap2 = Math.round(retireGap2 * 100) / 100;
  const pensionBudget2 = recPension2 <= pensionBudget2_val
    ? '✅预算充足'
    : '⚠️预算不足，请调整比例或延长缴费期';

  // ==================== 子女 ====================
  // 子女重疾险推荐额度 = computeChildCIRecommendation(年龄, 城市, 家庭收入)
  const childCIRec = computeChildCIRecommendation(
    input.childAge, input.city,
    incomeConversion1, incomeConversion2
  );
  // B34 = C16
  const childCIExist = input.childCIExisting;
  // B35 = MAX(0, B33 - B34)
  const childCIGap = Math.max(0, childCIRec - childCIExist);
  // B36 = D22
  const childCITerm = input.childCIPremiumBudget;
  // D33 = recommendMIPlan
  const childMedicalCost = baseMedicalCost1;
  const childMIGap = 0;
  const { type: childMIType, reason: childMIReason } = recommendMIPlan(
    input.child_社保医保, input.child_惠民保, input.child_百万医疗,
    input.child_中端医疗, input.child_高端医疗,
    childMedicalCost, childMIGap,
    input.childMIPremiumBudget, totalHouseholdIncome, input.childAge, false
  );
  // D34 = E22
  const childMITerm = input.childMIPremiumBudget;
  // D35 = 20（固定值）
  const childAccident = 20;
  // D36 = "刚需配齐"
  const childPriority = '刚需配齐';
  // B38 = IF(OR(B30="仅子女",B30="都需要"), 20, 0)
  const childLifeRec = (input.childParentLifeIns === '仅子女' || input.childParentLifeIns === '都需要') ? 20 : 0;
  // B39 = D31
  const childLifeExist = input.childLifeCoverage ? Excel.getLifeCoverage(input.childLifeCoverage) : 0;
  // B40 = 0
  const childLifeGap = 0;
  // D38 = 0
  const childLifePrem = 0;
  // D39 = IF(B30="都不需要","不推荐...",IF(B30="仅子女","...",...))
  const childLifeConclusion = input.childParentLifeIns === '都不需要'
    ? '不推荐（无收入，寿险非必需）'
    : input.childParentLifeIns === '仅子女'
      ? '可配置少量（建议≤20万），但非必需，优先保障经济支柱'
      : input.childParentLifeIns === '仅父母'
        ? '不推荐，子女无需寿险'
        : input.childParentLifeIns === '都需要'
          ? '子女可配置少量（建议≤20万），但非必需'
          : '请选择配置意愿';
  // 养老金 - 不推荐
  const childPensionResult = '不推荐（无收入，养老金非必需）';

  // ==================== 父母 ====================
  const parentCIRec = 0;
  const parentCIExist = input.parentCIExisting;
  const parentCIGap = Math.max(0, parentCIRec - parentCIExist);
  const parentCITerm = input.parentCIPremiumBudget;
  // D47 = recommendMIPlan
  const parentMedicalCost = baseMedicalCost1 * 1.5; // 老年人医疗费用约为中青年的1.5倍
  const parentMIGap = 0;
  const { type: parentMIType, reason: parentMIReason } = recommendMIPlan(
    input.parent_社保医保, input.parent_惠民保, input.parent_百万医疗,
    input.parent_中端医疗, input.parent_高端医疗,
    parentMedicalCost, parentMIGap,
    input.parentMIPremiumBudget, totalHouseholdIncome, 55, true
  );
  // 父母推荐最终使用新逻辑（而不是旧的固定升级链）
  const parentRecommendedMI = parentMIType;
  const parentMITerm = input.parentMIPremiumBudget;
  const parentAccident = '20';
  const parentPriority = '医疗+意外为主';
  // 寿险 - 父母
  const parentLifeRec = 0;
  const parentLifeExist = input.parentLifeCoverage ? Excel.getLifeCoverage(input.parentLifeCoverage) : 0;
  const parentLifeGap = 0;
  const parentLifePrem = 0;
  // D53 = IF(B30="都不需要","不推荐...",...)
  const parentLifeConclusion = input.childParentLifeIns === '都不需要'
    ? '不推荐（无收入，寿险非必需）'
    : input.childParentLifeIns === '仅子女'
      ? '不推荐，父母优先配置医疗/意外险'
      : input.childParentLifeIns === '仅父母'
        ? '不推荐（寿险非必需，建议医疗/意外险）'
        : input.childParentLifeIns === '都需要'
          ? '不推荐（父母寿险非必需，建议医疗/意外险）'
          : '请选择配置意愿';
  const parentPensionResult = '不推荐（已退休，养老金非必需）';

  // ==================== 汇总 ====================
  // 健康险整体缺口 = (重疾缺口1+医疗缺口1) + (重疾缺口2+医疗缺口2) - 流动资产×α
  const totalHealthGap = Math.max(0, Math.round(
    (totalHealthGap1 + totalHealthGap2 - liquidAsset * alpha) * 100
  ) / 100);
  const totalLifeGap = lifeGap1 + lifeGap2;
  const totalPensionGap = pensionGap1 + pensionGap2;
  const totalGap = Math.round((totalHealthGap + totalLifeGap + totalPensionGap) * 100) / 100;

  // 年度总保费（万元，用于风险评级和保费汇总表）
  const totalAnnualPrem =
    totalHealthPrem1 + totalHealthPrem2 +
    estLifePrem1 + estLifePrem2 +
    recPension1 + recPension2;
  const annualIncome = incomeConversion1 + incomeConversion2;
  const premiumToIncomeRatio = annualIncome > 0
    ? Math.round(totalAnnualPrem / annualIncome * 100) / 100
    : 99;

  // 加权风险指数：健康险0.85 + 寿险0.35 + 养老金0.25（充分考虑各险种紧迫度）
  const weightedPrem =
    (totalHealthPrem1 + totalHealthPrem2) * 0.85 +
    (estLifePrem1 + estLifePrem2) * 0.35 +
    (recPension1 + recPension2) * 0.25;
  const riskIndex = annualIncome > 0
    ? Math.round(weightedPrem / annualIncome * 10000) / 100
    : 99;

  const riskLevel = riskIndex <= 3.5 ? '低风险'
    : riskIndex <= 9 ? '中等风险'
    : '高风险';

  const priority = ciGap1 > 30 || ciGap2 > 30 ? '优先配置重疾险'
    : totalLifeGap > 50 ? '优先配置寿险'
    : totalPensionGap > 50 ? '优先补充养老金'
    : '全面配置健康保障';

  return {
    totalGap,
    riskLevel,
    riskIndex,
    priority,
    totalHealthGap,
    totalLifeGap,
    totalPensionGap,
    totalAnnualPrem: Math.round(totalAnnualPrem * 100) / 100,
    premiumToIncomeRatio,
    firstPerson: {
      recommendedCICoverage: recCI1,
      ciGap: ciGapOut1,
      recommendedMICoverage: recMI1,
      miGap: miGapOut1,
      totalHealthGap: totalHealthGap1,
      recommendedMIType: recMIType1,
      recommendedMIReason: miReason1,
      estimatedCIPremium: estCIPrem1,
      estimatedMIPremium: estMIPrem1,
      totalHealthPremium: totalHealthPrem1,
      healthBudgetResult: healthBudget1,
      recommendedLifeCoverage: recLife1,
      existingLifeCoverage: existingLifeOut1,
      lifeGap: lifeGap1,
      estimatedLifePremium: estLifePrem1,
      lifeBudgetResult: lifeBudget1,
      lifeTermSuggestion: lifeTerm1,
      recommendedPensionAnnual: recPension1,
      existingPensionFV: existingPensionFV1,
      annualRetireGoal: annualRetireGoal1,
      pensionGap: pensionGap1,
      payYears: payYears1,
      pensionBudgetResult: pensionBudget1,
    },
    secondPerson: {
      recommendedCICoverage: recCI2,
      ciGap: ciGapOut2,
      recommendedMICoverage: recMI2,
      miGap: miGapOut2,
      totalHealthGap: totalHealthGap2,
      recommendedMIType: recMIType2,
      recommendedMIReason: miReason2,
      estimatedCIPremium: estCIPrem2,
      estimatedMIPremium: estMIPrem2,
      totalHealthPremium: totalHealthPrem2,
      healthBudgetResult: healthBudget2,
      recommendedLifeCoverage: recLife2,
      existingLifeCoverage: existingLifeOut2,
      lifeGap: lifeGap2,
      estimatedLifePremium: estLifePrem2,
      lifeBudgetResult: lifeBudget2,
      lifeTermSuggestion: lifeTerm2,
      recommendedPensionAnnual: recPension2,
      existingPensionFV: existingPensionFV2,
      annualRetireGoal: annualRetireGoal2,
      pensionGap: pensionGap2,
      payYears: payYears2,
      pensionBudgetResult: pensionBudget2,
    },
    child: {
      recommendedCICoverage: childCIRec,
      existingCICoverage: childCIExist,
      ciGap: childCIGap,
      ciTerm: childCITerm,
      recommendedMIType: childMIType,
      recommendedMIReason: childMIReason,
      miTerm: childMITerm,
      recommendedAccidentCoverage: childAccident,
      priority: childPriority,
      recommendedLifeCoverage: childLifeRec,
      existingLifeCoverage: childLifeExist,
      lifeGap: childLifeGap,
      estimatedLifePremium: childLifePrem,
      lifeConclusion: childLifeConclusion,
      recommendedPensionAnnual: 0,
      pensionGap: 0,
      existingPensionFV: 0,
      payYears: 0,
      annualRetireGoal: null,
      pensionBudgetResult: childPensionResult,
    },
    parent: {
      recommendedCICoverage: parentCIRec,
      existingCICoverage: parentCIExist,
      ciGap: parentCIGap,
      ciTerm: parentCITerm,
      recommendedMIType: parentRecommendedMI,
      recommendedMIReason: parentMIReason,
      miTerm: parentMITerm,
      recommendedAccidentCoverage: parentAccident,
      priority: parentPriority,
      recommendedLifeCoverage: parentLifeRec,
      existingLifeCoverage: parentLifeExist,
      lifeGap: parentLifeGap,
      estimatedLifePremium: parentLifePrem,
      lifeConclusion: parentLifeConclusion,
      recommendedPensionAnnual: 0,
      pensionGap: 0,
      existingPensionFV: 0,
      payYears: 0,
      annualRetireGoal: null,
      pensionBudgetResult: parentPensionResult,
    },
  };
}
