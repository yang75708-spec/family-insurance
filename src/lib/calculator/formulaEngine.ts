import { Excel, getJobStabilityFactor, getLiquidAsset } from './excelEngine';
import { UserInput, CalculatedParams, InsuranceResult } from './types';

/**
 * 根据已有健康险组合，推荐下一级医疗险类型
 * 优先级：高端医疗 > 中端医疗 > 百万医疗 > 惠民保 > 社保医保
 */
function recommendNextMIType(hasSiShe: boolean, hasHuiMin: boolean, hasBaiWan: boolean, hasZhongDuan: boolean, hasGaoDuan: boolean, income: string): string {
  // 如果有高端医疗 → 已配置齐全
  if (hasGaoDuan) return '已配置高端医疗';
  // 如果有中端医疗 → 推荐升级到高端医疗
  if (hasZhongDuan) return '高端医疗';
  // 如果有百万医疗 → 推荐升级到中端医疗
  if (hasBaiWan) return '中端医疗';
  // 已有惠民保 → 推荐百万医疗
  if (hasHuiMin) return '百万医疗';
  // 仅有社保或全无 → 根据收入推荐
  if (income === '15万以下' || income === '15-30万') return '百万医疗';
  if (income === '30-60万' || income === '60-100万') return '中端医疗';
  // 高收入人群直接推荐高端医疗
  return '高端医疗';
}

/**
 * 根据收入水平推荐医疗险类型（结果页用）
 */
function recommendMITypeByIncome(income: string): string {
  if (income === '15万以下' || income === '15-30万') return '百万医疗';
  if (income === '30-60万' || income === '60-100万') return '中端医疗';
  return '高端医疗';
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
  const cityBase = city === '北上深' ? 65
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
  // L2 = SWITCH(D9,...)
  const citySalary1 = Excel.getCity(input.city);
  const citySalary2 = Excel.getCity(input.city);
  // L3
  const discountRate = 0.05;
  // L4 = SWITCH(D8,...)
  const expenseConversion = Excel.getExpense(input.annualExpense);
  // L5
  const inflationI = 0.025;
  // L6 = L1/(L1+M1)
  const incomeRatio1 = (incomeConversion1 + incomeConversion2) === 0
    ? 0.5
    : incomeConversion1 / (incomeConversion1 + incomeConversion2);
  // M6 = 1-L6
  const incomeRatio2 = 1 - incomeRatio1;
  // L7 = IF((B42-B3)<=4, B42-B3, 4)
  const ciProtectYears1 = Excel.IF(
    (input.firstPersonRetireAge - input.firstPersonAge) <= 4,
    input.firstPersonRetireAge - input.firstPersonAge,
    4
  );
  // M7 = IF((B43-B4)<=4, B43-B4, 4)
  const ciProtectYears2 = Excel.IF(
    (input.secondPersonRetireAge - input.secondPersonAge) <= 4,
    input.secondPersonRetireAge - input.secondPersonAge,
    4
  );
  // L8 = CHOOSE(MATCH(D6,...),...) + CHOOSE(MATCH(D7,...),...)
  const liquidAsset = getLiquidAsset(input.bankDeposit, input.lowRiskInvestment);

  // ==================== H/I 列：健康险参数 ====================
  // H9 = IF(D9="北上深",80,IF(D9="二线城市",50,IF(D9="普通地级市",30,30)))
  const baseMedicalCost1 = input.city === '北上深' ? 80
    : input.city === '二线城市' ? 50
    : input.city === '普通地级市' ? 30 : 30;
  // I9 same
  const baseMedicalCost2 = baseMedicalCost1;

  // H10 = getIncomeElasticity(B5)
  const incomeElasticity1 = Excel.getIncomeElasticity(input.firstPersonIncome);
  // I10
  const incomeElasticity2 = Excel.getIncomeElasticity(input.secondPersonIncome);

  // H11 = getMedicalCapKmax(B5)
  const medicalCapKmax1 = Excel.getMedicalCapKmax(input.firstPersonIncome);
  // I11
  const medicalCapKmax2 = Excel.getMedicalCapKmax(input.secondPersonIncome);

  // H12 = MIN(H9+L1*H10, H11*H9)
  const medicalCost1 = Math.min(
    baseMedicalCost1 + incomeConversion1 * incomeElasticity1,
    medicalCapKmax1 * baseMedicalCost1
  );
  // I12 = MIN(I9+M1*I10, I11*I9)
  const medicalCost2 = Math.min(
    baseMedicalCost2 + incomeConversion2 * incomeElasticity2,
    medicalCapKmax2 * baseMedicalCost2
  );

  // H13 = IF(D9="北上深",7,IF(D9="二线城市",7,6))
  const kcap1 = input.city === '北上深' ? 7
    : input.city === '二线城市' ? 7 : 6;
  const kcap2 = kcap1;

  // H14 = IF(L1<10,0.9, IF(L1<30,0.7, 0.5))
  const kDir1 = incomeConversion1 < 10 ? 0.9 : (incomeConversion1 < 30 ? 0.7 : 0.5);
  // I14
  const kDir2 = incomeConversion2 < 10 ? 0.9 : (incomeConversion2 < 30 ? 0.7 : 0.5);

  // H15 = IF(D9="北上深",1.2,IF(D9="二线城市",1,IF(D9="普通地级市",0.8,0.6)))
  const kCity1 = input.city === '北上深' ? 1.2
    : input.city === '二线城市' ? 1
    : input.city === '普通地级市' ? 0.8 : 0.6;
  const kCity2 = kCity1;

  // H16 = MIN(H12, L2*H13) * 0.5 * H14 * H15 — SocialCoverage
  const medicalCoverage1 = Math.min(medicalCost1, citySalary1 * kcap1) * 0.5 * kDir1 * kCity1;
  // I16
  const medicalCoverage2 = Math.min(medicalCost2, citySalary2 * kcap2) * 0.5 * kDir2 * kCity2;

  // 根据勾选的健康险计算已有有效保额
  const effCoverage1 = getEffectiveCoverageFromCheckboxes(
    input.p1_社保医保, input.p1_惠民保, input.p1_百万医疗,
    input.p1_中端医疗, input.p1_高端医疗
  );
  const effCoverage2 = getEffectiveCoverageFromCheckboxes(
    input.p2_社保医保, input.p2_惠民保, input.p2_百万医疗,
    input.p2_中端医疗, input.p2_高端医疗
  );

  // H17 = MAX(0, H12 - H16 - MAX(D14, 勾选有效保额)) — MedicalGap
  const medicalGap1 = Math.max(0, Math.round(
    (medicalCost1 - medicalCoverage1 - Math.max(input.firstPersonMIExisting, effCoverage1)) * 100
  ) / 100);
  // I17 = MAX(0, I12 - I16 - MAX(D15, 勾选有效保额))
  const medicalGap2 = Math.max(0, Math.round(
    (medicalCost2 - medicalCoverage2 - Math.max(input.secondPersonMIExisting, effCoverage2)) * 100
  ) / 100);

  // H18 = CHOOSE(MATCH(B7,{...}),0.7,1,1.4,1.6)
  const kjob1 = getJobStabilityFactor(input.incomeStability);
  // I18 = CHOOSE(MATCH(第二支柱稳定性,{...}),...)
  const kjob2 = getJobStabilityFactor(input.incomeStability2);

  // H19 = IF(B3<30,0.065, IF(B3<40,0.04, IF(B3<50,0.02, 0.005)))
  const incomeGrowthRate1 = input.firstPersonAge < 30 ? 0.065
    : input.firstPersonAge < 40 ? 0.04
    : input.firstPersonAge < 50 ? 0.02 : 0.005;
  // I19
  const incomeGrowthRate2 = input.secondPersonAge < 30 ? 0.065
    : input.secondPersonAge < 40 ? 0.04
    : input.secondPersonAge < 50 ? 0.02 : 0.005;

  // H20 = B42 - B3
  const remainingN1 = input.firstPersonRetireAge - input.firstPersonAge;
  // I20 = B43 - B4
  const remainingN2 = input.secondPersonRetireAge - input.secondPersonAge;

  // H21 = L1 * (1 - ((1+H19)/(1+L3))^L7) / (L3 - H19) * H18
  const pvIncomeAdjusted1 = incomeConversion1 *
    (1 - Math.pow((1 + incomeGrowthRate1) / (1 + discountRate), ciProtectYears1)) /
    (discountRate - incomeGrowthRate1) * kjob1;
  // I21 = M1 * (1 - ((1+I19)/(1+L3))^M7) / (L3 - I19) * I18
  const pvIncomeAdjusted2 = incomeConversion2 *
    (1 - Math.pow((1 + incomeGrowthRate2) / (1 + discountRate), ciProtectYears2)) /
    (discountRate - incomeGrowthRate2) * kjob2;

  // H23 = L4 * (1 - ((1+L5)/(1+L3))^L7) / (L3 - L5) * L6
  const pvExpense1 = expenseConversion *
    (1 - Math.pow((1 + inflationI) / (1 + discountRate), ciProtectYears1)) /
    (discountRate - inflationI) * incomeRatio1;
  // I23 = L4 * (1 - ((1+L5)/(1+L3))^M7) / (L3 - L5) * M6
  const pvExpense2 = expenseConversion *
    (1 - Math.pow((1 + inflationI) / (1 + discountRate), ciProtectYears2)) /
    (discountRate - inflationI) * incomeRatio2;

  // H24 = MAX(0, H21 + H23 - C14 - L8) — CIGap
  const ciGap1 = Math.max(0, Math.round((pvIncomeAdjusted1 + pvExpense1 - input.firstPersonCIExisting - liquidAsset) * 100) / 100);
  // I24 = MAX(0, I21 + I23 - C15 - L8)
  const ciGap2 = Math.max(0, Math.round((pvIncomeAdjusted2 + pvExpense2 - input.secondPersonCIExisting - liquidAsset) * 100) / 100);

  // H25 = IF(B3>=50,0.065, IF(B3>=40,0.04, IF(B3>=30,0.025, IF(B3>=20,0.015, 0))))
  const kpremium1 = input.firstPersonAge >= 50 ? 0.065
    : input.firstPersonAge >= 40 ? 0.04
    : input.firstPersonAge >= 30 ? 0.025
    : input.firstPersonAge >= 20 ? 0.015 : 0;
  // I25
  const kpremium2 = input.secondPersonAge >= 50 ? 0.065
    : input.secondPersonAge >= 40 ? 0.04
    : input.secondPersonAge >= 30 ? 0.025
    : input.secondPersonAge >= 20 ? 0.015 : 0;

  // ==================== 第一经济支柱——健康险输出 ====================
  // B3 = H21 + H23
  const recCI1 = Math.round((pvIncomeAdjusted1 + pvExpense1) * 100) / 100;
  // B4 = H24
  const ciGapOut1 = ciGap1;
  // B5 = H12
  const recMI1 = medicalCost1;
  // B6 = H17
  const miGapOut1 = medicalGap1;
  // B7 = B4 + B6
  const totalHealthGap1 = Math.round((ciGapOut1 + miGapOut1) * 100) / 100;

  // D3 = recommendNextMIType(基于新版多选勾选)
  const recMIType1 = recommendNextMIType(
    input.p1_社保医保, input.p1_惠民保, input.p1_百万医疗,
    input.p1_中端医疗, input.p1_高端医疗, input.firstPersonIncome
  );
  // D4 = B4 * H25
  const estCIPrem1 = Math.round(ciGapOut1 * kpremium1 * 100) / 100;
  // D5 = estimateMIPremium(年龄, 收入, 推荐类型)
  const estMIPrem1 = estimateMIPremium(input.firstPersonAge, input.firstPersonIncome, recMIType1);
  // D6 = D4 + D5
  const totalHealthPrem1 = Math.round((estCIPrem1 + estMIPrem1) * 100) / 100;
  // D7 = IF(D6 <= (D20+E20), "✅预算充足", "⚠️预算不足")
  const healthBudget1 = totalHealthPrem1 <= (input.firstPersonCIPremiumBudget + input.firstPersonMIPremiumBudget)
    ? '✅预算充足'
    : '⚠️预算不足';

  // ==================== 第一经济支柱——寿险输出 ====================
  // B9 = MAX(
  //   MAX(0, mortgageVal + loanVal + expenseVal*G4*(1+G7)^(G4/2)*G9 + B8*30*(1+G7)^(G3/2) + B9*20*(1+G7)^(G6/2)*G9 - (deposit+invest)*(1+G7) - existingLife),
  //   MAX(0, income*D10*(1+G8)^(D10/2)*G9 - existingLife)
  // )
  const mortgageVal1 = Excel.getMortgage(input.mortgageBalance);
  const otherLoanVal1 = Excel.getOtherLoan(input.otherLoanAmount);
  const expenseVal1 = Excel.getExpenseVal(input.annualExpense);
  const depositVal1 = Excel.getDeposit(input.bankDeposit);
  const investVal1 = Excel.getInvestment(input.lowRiskInvestment);
  const existingLife1 = Excel.getLifeCoverage(input.firstPersonLifeCoverage);

  const lifeNeedA1 = Math.max(0,
    mortgageVal1 + otherLoanVal1 +
    expenseVal1 * firstProtectYears * Math.pow(1 + inflationRate, firstProtectYears / 2) * discountFactor +
    input.childCount * 30 * Math.pow(1 + inflationRate, childToGradYears / 2) +
    input.parentSupportCount * 20 * Math.pow(1 + inflationRate, supportYears / 2) * discountFactor -
    (depositVal1 + investVal1) * (1 + inflationRate) -
    existingLife1
  );

  const lifeNeedB1 = Math.max(0,
    incomeConversion1 * firstRemainingYears * Math.pow(1 + salaryGrowthRate, firstRemainingYears / 2) * discountFactor -
    existingLife1
  );

  const recLife1 = Math.round(Math.max(lifeNeedA1, lifeNeedB1) * 100) / 100;

  // B10 = D28 (已有寿险保额)
  const existingLifeOut1 = existingLife1;

  // B11 = MAX(0, B9 - IF(B10="30-50万",40, IF(B10="50万以内",25, IF(B10="50-100万",75, 0))))
  const lifeGap1 = Math.max(0, parseFloat((recLife1 - existingLife1).toFixed(2)));

  // D9 = B11 * 10
  const estLifePrem1 = Math.round(lifeGap1 * 10 * 100) / 100;

  // D10 = IF(D9 <= D35, "✅ 预算充足", "...")
  const lifeBudget1 = estLifePrem1 <= input.firstPersonLifeBudget
    ? '✅ 预算充足'
    : '⚠️ 预算不足，建议降低保额或调整期限';

  // D11 = IF(B35="63岁","推荐配置定期寿险至63岁","推荐配置至65岁或终身")
  const lifeTerm1 = input.firstPersonLifeTerm === '63岁'
    ? '推荐配置定期寿险至63岁'
    : '推荐配置至65岁或终身';

  // ==================== 第一经济支柱——养老金输出 ====================
  // H3 = D42*(0.03+1)^(B42-B3)
  const retireNeedFV1 = input.firstPersonRetireGoal * Math.pow(1 + inflationRate, remainingN1);
  // H4 = PV(0.05, C42, -H3, 0, 1)
  const retireNeedPV1 = Excel.PV(discountRate, input.firstPersonRetireYears, -retireNeedFV1, 0, 1);
  // H5 = FV(0.05, B42-B3, 0, -B46, 0) + FV(0.05, B42-B3, 0, -C46, 0) + FV(0.05, B42-B3, 0, -D46, 0) + PV(0.05, C42, -E46*12, 0, 1)
  const existingReserveFV1 =
    Excel.FV(discountRate, remainingN1, 0, -input.firstPersonPensionFund, 0) +
    Excel.FV(discountRate, remainingN1, 0, -input.firstPersonComPension, 0) +
    Excel.FV(discountRate, remainingN1, 0, -input.firstPersonPersonalPension, 0) +
    Excel.PV(discountRate, input.firstPersonRetireYears, -input.firstPersonSocialPension * 12, 0, 1);
  // H6 = MAX(0, H4 - H5)
  const retireGap1 = Math.max(0, retireNeedPV1 - existingReserveFV1);

  // B13 = PMT(0.05, B52, 0, -H6, 1)
  const recPension1 = Math.round(-Excel.PMT(discountRate, input.firstPersonPayYears, 0, -retireGap1, 1) * 100) / 100;
  // B14 = H5
  const existingPensionFV1 = existingReserveFV1;
  // B15 = D42
  const annualRetireGoal1 = input.firstPersonRetireGoal;
  // D13 = H6
  const pensionGap1 = Math.round(retireGap1 * 100) / 100;
  // D14 = B52
  const payYears1 = input.firstPersonPayYears;
  // D15 = IF(B13 <= D52, "✅预算充足", "⚠️...")
  const pensionBudget1 = recPension1 <= input.firstPersonPensionBudget
    ? '✅预算充足'
    : '⚠️预算不足，请调整比例或延长缴费期';

  // ==================== 第二经济支柱——健康险输出 ====================
  // B18 = I21 + I23
  const recCI2 = Math.round((pvIncomeAdjusted2 + pvExpense2) * 100) / 100;
  // B19 = I24
  const ciGapOut2 = ciGap2;
  // B20 = I12
  const recMI2 = medicalCost2;
  // B21 = I17
  const miGapOut2 = medicalGap2;
  // B22 = I17 + I24
  const totalHealthGap2 = Math.round((ciGapOut2 + miGapOut2) * 100) / 100;

  // D18 = recommendNextMIType(基于新版多选勾选)
  const recMIType2 = recommendNextMIType(
    input.p2_社保医保, input.p2_惠民保, input.p2_百万医疗,
    input.p2_中端医疗, input.p2_高端医疗, input.secondPersonIncome
  );
  // D19 = B19 * I25
  const estCIPrem2 = Math.round(ciGapOut2 * kpremium2 * 100) / 100;
  // D20 = estimateMIPremium(年龄, 收入, 推荐类型)
  const estMIPrem2 = estimateMIPremium(input.secondPersonAge, input.secondPersonIncome, recMIType2);
  // D21 = D19 + D20
  const totalHealthPrem2 = Math.round((estCIPrem2 + estMIPrem2) * 100) / 100;
  // D22 = IF(D21 <= (D21+E21), ...)
  const healthBudget2 = totalHealthPrem2 <= (input.secondPersonCIPremiumBudget + input.secondPersonMIPremiumBudget)
    ? '✅预算充足'
    : '⚠️预算不足';

  // ==================== 第二经济支柱——寿险输出 ====================
  const mortgageVal2 = Excel.getMortgageP2(input.mortgageBalance);
  const otherLoanVal2 = Excel.getOtherLoanP2(input.otherLoanAmount);
  const existingLife2 = Excel.getLifeCoverage(input.secondPersonLifeCoverage);

  const lifeNeedA2 = Math.max(0,
    mortgageVal2 + otherLoanVal2 +
    expenseVal1 * secondProtectYears * Math.pow(1 + inflationRate, secondProtectYears / 2) * discountFactor +
    input.childCount * 15 * Math.pow(1 + inflationRate, childToGradYears / 2) +
    input.parentSupportCount * 10 * Math.pow(1 + inflationRate, supportYears / 2) * discountFactor -
    (depositVal1 + investVal1) * 0.5 * (1 + inflationRate) -
    existingLife2
  );

  const lifeNeedB2 = Math.max(0,
    incomeConversion2 * secondRemainingWorkYears * Math.pow(1 + salaryGrowthRate, secondRemainingWorkYears / 2) * discountFactor -
    existingLife2
  );

  const recLife2 = Math.round(Math.max(lifeNeedA2, lifeNeedB2) * 100) / 100;

  // B25 = D29
  const existingLifeOut2 = existingLife2;

  // B26 = MAX(0, B24 - IF(D29="30万以内",15,...))
  const lifeGap2 = Math.max(0, parseFloat((recLife2 - existingLife2).toFixed(2)));

  // D24 = B26 * 10
  const estLifePrem2 = Math.round(lifeGap2 * 10 * 100) / 100;

  // D25 = IF(D24 <= D36, ...)
  const lifeBudget2 = estLifePrem2 <= input.secondPersonLifeBudget
    ? '✅ 预算充足'
    : '⚠️ 预算不足，建议降低保额或调整期限';

  // D26 = IF(B36="63岁", ...)
  const lifeTerm2 = input.secondPersonLifeTerm === '63岁'
    ? '推荐配置定期寿险至63岁'
    : '推荐配置至65岁或终身';

  // ==================== 第二经济支柱——养老金输出 ====================
  const retireNeedFV2 = input.secondPersonRetireGoal * Math.pow(1 + inflationRate, remainingN2);
  const retireNeedPV2 = Excel.PV(discountRate, input.secondPersonRetireYears, -retireNeedFV2, 0, 1);
  const existingReserveFV2 =
    Excel.FV(discountRate, remainingN2, 0, -input.secondPersonPensionFund, 0) +
    Excel.FV(discountRate, remainingN2, 0, -input.secondPersonComPension, 0) +
    Excel.FV(discountRate, remainingN2, 0, -input.secondPersonPersonalPension, 0) +
    Excel.PV(discountRate, input.secondPersonRetireYears, -input.secondPersonSocialPension * 12, 0, 1);
  const retireGap2 = Math.max(0, retireNeedPV2 - existingReserveFV2);

  const recPension2 = input.secondPersonPayYears > 0
    ? Math.round(-Excel.PMT(discountRate, input.secondPersonPayYears, 0, -retireGap2, 1) * 100) / 100
    : 0;
  const existingPensionFV2 = existingReserveFV2;
  const annualRetireGoal2 = input.secondPersonRetireGoal;
  const pensionGap2 = Math.round(retireGap2 * 100) / 100;
  const payYears2 = input.secondPersonPayYears;
  const pensionBudget2 = recPension2 <= input.secondPersonPensionBudget
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
  // D33 = recommendNextMIType(基于子女勾选)
  const childMIType = recommendNextMIType(
    input.child_社保医保, input.child_惠民保, input.child_百万医疗,
    input.child_中端医疗, input.child_高端医疗, '15万以下'
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
  // D47 = recommendNextMIType(基于父母勾选，父母推荐偏稳健)
  const parentMIType = recommendNextMIType(
    input.parent_社保医保, input.parent_惠民保, input.parent_百万医疗,
    input.parent_中端医疗, input.parent_高端医疗, '15-30万'
  );

  // 如果是父母，惠民保/防癌医疗险也是好选择
  const parentRecommendedMI = input.parent_高端医疗 ? '已配置高端医疗'
    : input.parent_中端医疗 ? '高端医疗'
    : input.parent_百万医疗 ? '中端医疗'
    : input.parent_惠民保 ? '百万医疗'
    : input.parent_社保医保 ? '防癌医疗险/惠民保'
    : '防癌医疗险/惠民保';
  const parentMITerm = input.parentMIPremiumBudget;
  const parentAccident = '20/人';
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
  const totalHealthGap = totalHealthGap1 + totalHealthGap2;
  const totalLifeGap = lifeGap1 + lifeGap2;
  const totalPensionGap = pensionGap1 + pensionGap2;
  const totalGap = Math.round((totalHealthGap + totalLifeGap + totalPensionGap) * 100) / 100;

  // 年度总保费（万元，用于风险评级和保费汇总表）
  const totalAnnualPrem =
    totalHealthPrem1 + totalHealthPrem2 +
    estLifePrem1 / 10000 + estLifePrem2 / 10000 +
    recPension1 / 10000 + recPension2 / 10000;
  const annualIncome = incomeConversion1 + incomeConversion2;
  const premiumToIncomeRatio = annualIncome > 0
    ? Math.round(totalAnnualPrem / annualIncome * 100) / 100
    : 99;

  const riskLevel = premiumToIncomeRatio < 1 ? '低风险'
    : premiumToIncomeRatio <= 3 ? '中等风险'
    : '高风险';

  const priority = ciGap1 > 30 || ciGap2 > 30 ? '优先配置重疾险'
    : totalLifeGap > 50 ? '优先配置寿险'
    : totalPensionGap > 50 ? '优先补充养老金'
    : '全面配置健康保障';

  return {
    totalGap,
    riskLevel,
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
