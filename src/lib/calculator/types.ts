// ====== 用户输入（对应 Excel"用户端"Sheet） ======
export interface UserInput {
  // 家庭核心成员基础信息
  firstPersonAge: number;        // B3
  secondPersonAge: number;       // B4
  firstPersonIncome: string;     // B5 - 第一经济支柱年税后收入(下拉)
  secondPersonIncome: string;    // B6
  incomeStability: string;       // B7 - 第一支柱收入稳定性(下拉)
  incomeStability2: string;      // 第二支柱收入稳定性(下拉)
  childCount: number;            // B8 - 子女人数
  parentSupportCount: number;    // B9 - 赡养父母人数
  childAge: number;              // B10 - 子女当前年龄

  // 家庭财务状况
  mortgageBalance: string;       // D3 - 房贷余额(下拉)
  mortgageYears: string;         // D4 - 房贷剩余还款年限(下拉)
  otherLoanAmount: string;       // D5 - 其他贷款合计(下拉)
  bankDeposit: string;           // D6 - 银行存款(下拉)
  lowRiskInvestment: string;     // D7 - 低风险理财(下拉)
  annualExpense: string;         // D8 - 家庭年度刚性开销(下拉)
  city: string;                  // D9 - 家庭居住城市(下拉)

  // ===== 健康险输入（新版：表格式多选） =====
  // 第一支柱 - 各险种勾选
  p1_社保医保: boolean;
  p1_惠民保: boolean;
  p1_百万医疗: boolean;
  p1_中端医疗: boolean;
  p1_高端医疗: boolean;
  p1_重疾险: boolean;
  // 第二支柱
  p2_社保医保: boolean;
  p2_惠民保: boolean;
  p2_百万医疗: boolean;
  p2_中端医疗: boolean;
  p2_高端医疗: boolean;
  p2_重疾险: boolean;
  // 子女
  child_社保医保: boolean;
  child_惠民保: boolean;
  child_百万医疗: boolean;
  child_中端医疗: boolean;
  child_高端医疗: boolean;
  child_重疾险: boolean;
  // 父母
  parent_社保医保: boolean;
  parent_惠民保: boolean;
  parent_百万医疗: boolean;
  parent_中端医疗: boolean;
  parent_高端医疗: boolean;
  parent_重疾险: boolean;

  // 各家庭成员的重疾险已有保额（万元）
  firstPersonCIExisting: number; // C14
  secondPersonCIExisting: number;// C15
  childCIExisting: number;       // C16
  parentCIExisting: number;      // C17

  // 各家庭成员的医疗险已有保额（万元）
  firstPersonMIExisting: number; // D14
  secondPersonMIExisting: number;// D15
  childMIExisting: number;       // D16
  parentMIExisting: number;      // D17

  // 旧版兼容字段（字符串单选保留，但不推荐使用）
  firstPersonHealthIns: string;  // B14
  secondPersonHealthIns: string; // B15
  childHealthIns: string;        // B16
  parentHealthIns: string;       // B17

  // 预算（万元）
  firstPersonCIPremiumBudget: number;
  secondPersonCIPremiumBudget: number;
  childCIPremiumBudget: number;
  parentCIPremiumBudget: number;
  firstPersonMIPremiumBudget: number;
  secondPersonMIPremiumBudget: number;
  childMIPremiumBudget: number;
  parentMIPremiumBudget: number;

  parentAge: string;             // A19
  parentHealth: string;          // A20

  firstPersonHighEndMI: boolean;  // 保留向后兼容
  secondPersonHighEndMI: boolean;
  elderHighEndMI: boolean;
  childHighEndMI: boolean;

  // 寿险输入
  firstPersonLifeIns: string;    // B28
  secondPersonLifeIns: string;   // B29
  childParentLifeIns: string;    // B30 - 是否为子女父母配寿险
  childLifeIns: string;          // B31
  parentLifeIns: string;         // B32

  firstPersonLifeCoverage: string;// D28
  secondPersonLifeCoverage: string;// D29
  childLifeCoverage: string;     // D31
  parentLifeCoverage: string;    // D32

  firstPersonLifeTerm: string;   // B35
  secondPersonLifeTerm: string;  // B36
  firstPersonLifeBudget: number; // D35
  secondPersonLifeBudget: number;// D36

  // 养老金输入
  firstPersonRetireAge: number;  // B42
  secondPersonRetireAge: number; // B43
  firstPersonRetireYears: number;// C42
  secondPersonRetireYears: number;// C43
  firstPersonRetireGoal: number; // D42
  secondPersonRetireGoal: number;// D43
  firstPersonSalaryGrowth: number;// E42
  secondPersonSalaryGrowth: number;// E43

  firstPersonPensionFund: number;// B46
  secondPersonPensionFund: number;// B47
  firstPersonComPension: number; // C46
  secondPersonComPension: number;// C47
  firstPersonPersonalPension: number;// D46
  secondPersonPersonalPension: number;// D47
  firstPersonSocialPension: number;// E46
  secondPersonSocialPension: number;// E47

  expectedReturn: number;        // B49
  firstPersonPayYears: number;   // B52
  secondPersonPayYears: number;  // B53
  firstPersonPensionBudget: number;// D52
  secondPersonPensionBudget: number;// D53
}

// ====== 中间计算结果（对应家庭保险决策表中间列） ======
export interface CalculatedParams {
  // L / M column - 收入转化
  incomeConversion1: number;   // L1
  incomeConversion2: number;   // M1
  citySalary1: number;          // L2
  citySalary2: number;          // M2
  discountRate: number;         // L3 - 0.05
  expenseConversion: number;    // L4
  inflationI: number;           // L5 - 0.025
  incomeRatio1: number;         // L6
  incomeRatio2: number;         // M6
  ciProtectYears1: number;      // L7
  ciProtectYears2: number;      // M7
  liquidAsset: number;          // L8

  // 衍生计算（用户端 G/H 列）
  firstRemainingYears: number;   // D10 = MAX(0,63-B3)
  secondRemainingWorkYears: number;// G2 = MAX(0,63-B4)
  childToGradYears: number;      // G3 = MAX(0,22-B10)
  firstProtectYears: number;     // G4 = MIN(D10,G3)
  secondProtectYears: number;    // G5 = MIN(G2,G3)
  supportYears: number;          // G6 = 20
  inflationRate: number;         // G7 = 0.03
  salaryGrowthRate: number;      // G8 = 0.05
  discountFactor: number;        // G9 = 0.8

  // H/I column - 健康险参数
  baseMedicalCost1: number;     // H9
  baseMedicalCost2: number;     // I9
  incomeElasticity1: number;    // H10
  incomeElasticity2: number;    // I10
  medicalCapKmax1: number;      // H11
  medicalCapKmax2: number;      // I11
  medicalCost1: number;         // H12
  medicalCost2: number;         // I12
  kcap1: number;                // H13
  kcap2: number;                // I13
  kDir1: number;                // H14
  kDir2: number;                // I14
  kCity1: number;               // H15
  kCity2: number;               // I15
  medicalCoverage1: number;     // H16 - SocialCoverage
  medicalCoverage2: number;     // I16
  medicalGap1: number;          // H17
  medicalGap2: number;          // I17
  kjob1: number;                // H18
  kjob2: number;                // I18
  incomeGrowthRate1: number;    // H19
  incomeGrowthRate2: number;    // I19
  remainingN1: number;          // H20
  remainingN2: number;          // I20
  pvIncomeAdjusted1: number;    // H21
  pvIncomeAdjusted2: number;    // I21
  pvExpense1: number;           // H23
  pvExpense2: number;           // I23
  ciGap1: number;               // H24
  ciGap2: number;               // I24
  kpremium1: number;            // H25
  kpremium2: number;            // I25

  // H/I column - 养老金
  retireNeedFV1: number;        // H3
  retireNeedFV2: number;        // I3
  retireNeedPV1: number;        // H4
  retireNeedPV2: number;        // I4
  existingReserveFV1: number;   // H5
  existingReserveFV2: number;   // I5
  retireGap1: number;           // H6
  retireGap2: number;           // I6
}

// ====== 输出结果类型 ======
export interface PersonInsuranceResult {
  // 健康险
  recommendedCICoverage: number;   // B3
  ciGap: number;                   // B4
  recommendedMICoverage: number;   // B5
  miGap: number;                   // B6
  totalHealthGap: number;          // B7
  recommendedMIType: string;       // D3
  recommendedMIReason: string;     // 推荐理由
  estimatedCIPremium: number;      // D4
  estimatedMIPremium: number;      // D5
  totalHealthPremium: number;      // D6
  healthBudgetResult: string;      // D7

  // 寿险
  recommendedLifeCoverage: number; // B9
  existingLifeCoverage: number;    // B10
  lifeGap: number;                 // B11
  estimatedLifePremium: number;    // D9
  lifeBudgetResult: string;        // D10
  lifeTermSuggestion: string;      // D11

  // 养老金
  recommendedPensionAnnual: number; // B13
  existingPensionFV: number;        // B14
  annualRetireGoal: number;         // B15
  pensionGap: number;               // D13
  payYears: number;                 // D14
  pensionBudgetResult: string;      // D15
}

export interface Person2InsuranceResult {
  recommendedCICoverage: number;   // B18
  ciGap: number;                   // B19
  recommendedMICoverage: number;   // B20
  miGap: number;                   // B21
  totalHealthGap: number;          // B22
  recommendedMIType: string;       // D18
  recommendedMIReason: string;     // 推荐理由
  estimatedCIPremium: number;      // D19
  estimatedMIPremium: number;      // D20
  totalHealthPremium: number;      // D21
  healthBudgetResult: string;      // D22

  recommendedLifeCoverage: number; // B24
  existingLifeCoverage: number;    // B25
  lifeGap: number;                 // B26
  estimatedLifePremium: number;    // D24
  lifeBudgetResult: string;        // D25
  lifeTermSuggestion: string;      // D26

  recommendedPensionAnnual: number; // B28
  existingPensionFV: number;        // B29
  annualRetireGoal: number;         // B30
  pensionGap: number;               // D28
  payYears: number;                 // D29
  pensionBudgetResult: string;      // D30
}

export interface ChildInsuranceResult {
  recommendedCICoverage: number;  // B33
  existingCICoverage: number;     // B34
  ciGap: number;                  // B35
  ciTerm: number;                 // B36
  recommendedMIType: string;      // D33
  recommendedMIReason: string;
  miTerm: number;                 // D34
  recommendedAccidentCoverage: number; // D35
  priority: string;               // D36
  recommendedLifeCoverage: number;// B38
  existingLifeCoverage: number;   // B39
  lifeGap: number;                // B40
  estimatedLifePremium: number;   // D38
  lifeConclusion: string;         // D39
  recommendedPensionAnnual: number;// B42
  pensionGap: number;             // D42
  existingPensionFV: number;      // B43
  payYears: number;               // D43
  annualRetireGoal: number | null;// (heading)
  pensionBudgetResult: string;    // D44
}

export interface ParentInsuranceResult {
  recommendedCICoverage: number;  // B47
  existingCICoverage: number;     // B48
  ciGap: number;                  // B49
  ciTerm: number;                 // B50
  recommendedMIType: string;      // D47
  recommendedMIReason: string;
  miTerm: number;                 // D48
  recommendedAccidentCoverage: string; // D49
  priority: string;               // D50
  recommendedLifeCoverage: number;// B52
  existingLifeCoverage: number;   // B53
  lifeGap: number;                // B54
  estimatedLifePremium: number;   // D52
  lifeConclusion: string;         // D53
  recommendedPensionAnnual: number;// B56
  pensionGap: number;             // D56
  existingPensionFV: number;      // B57
  payYears: number;               // D57
  annualRetireGoal: number | null;
  pensionBudgetResult: string;    // D58
}

export interface InsuranceResult {
  totalGap: number;
  riskLevel: string;
  priority: string;
  totalAnnualPrem: number;         // 年度总保费（万元）
  premiumToIncomeRatio: number;    // 保费/收入比
  firstPerson: PersonInsuranceResult;
  secondPerson: Person2InsuranceResult;
  child: ChildInsuranceResult;
  parent: ParentInsuranceResult;
  totalHealthGap: number;
  totalLifeGap: number;
  totalPensionGap: number;
}
