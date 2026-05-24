import { UserInput } from './types';

export const defaultInput: UserInput = {
  // 家庭信息
  firstPersonAge: 30,
  secondPersonAge: 28,
  firstPersonIncome: '15-30万',
  secondPersonIncome: '15万以下',
  incomeStability: '较稳定（大型企业核心岗）',
  childCount: 1,
  parentSupportCount: 2,
  childAge: 3,

  // 财务
  mortgageBalance: '大于等于100万',
  mortgageYears: '20年以上',
  otherLoanAmount: '无其他贷款',
  bankDeposit: '5-20万',
  lowRiskInvestment: '5万以内',
  annualExpense: '10-20万',
  city: '二线城市',

  // 健康险（新版：全部默认勾选社保医保）
  p1_社保医保: true,
  p1_惠民保: false,
  p1_百万医疗: false,
  p1_中端医疗: false,
  p1_高端医疗: false,
  p1_重疾险: false,
  p2_社保医保: true,
  p2_惠民保: false,
  p2_百万医疗: false,
  p2_中端医疗: false,
  p2_高端医疗: false,
  p2_重疾险: false,
  child_社保医保: true,
  child_惠民保: false,
  child_百万医疗: false,
  child_中端医疗: false,
  child_高端医疗: false,
  child_重疾险: false,
  parent_社保医保: true,
  parent_惠民保: false,
  parent_百万医疗: false,
  parent_中端医疗: false,
  parent_高端医疗: false,
  parent_重疾险: false,

  firstPersonCIExisting: 0,
  secondPersonCIExisting: 0,
  childCIExisting: 0,
  parentCIExisting: 0,

  firstPersonMIExisting: 0,
  secondPersonMIExisting: 0,
  childMIExisting: 0,
  parentMIExisting: 0,

  // 旧版兼容
  firstPersonHealthIns: '社保医保',
  secondPersonHealthIns: '社保医保',
  childHealthIns: '社保医保',
  parentHealthIns: '社保医保',

  parentAge: '50-60岁',
  parentHealth: '良好',

  firstPersonCIPremiumBudget: 3,
  secondPersonCIPremiumBudget: 2,
  childCIPremiumBudget: 0,
  parentCIPremiumBudget: 0,

  firstPersonMIPremiumBudget: 0.5,
  secondPersonMIPremiumBudget: 0.4,
  childMIPremiumBudget: 0,
  parentMIPremiumBudget: 0,

  firstPersonHighEndMI: false,
  secondPersonHighEndMI: false,
  elderHighEndMI: false,
  childHighEndMI: false,

  // 寿险
  firstPersonLifeIns: '无',
  secondPersonLifeIns: '无',
  childParentLifeIns: '都不需要',
  childLifeIns: '无',
  parentLifeIns: '无',

  firstPersonLifeCoverage: '无',
  secondPersonLifeCoverage: '无',
  childLifeCoverage: '无',
  parentLifeCoverage: '无',

  firstPersonLifeTerm: '65岁',
  secondPersonLifeTerm: '65岁',

  firstPersonLifeBudget: 5000,
  secondPersonLifeBudget: 3000,

  // 养老金
  firstPersonRetireAge: 65,
  secondPersonRetireAge: 65,
  firstPersonRetireYears: 20,
  secondPersonRetireYears: 20,

  firstPersonRetireGoal: 12,
  secondPersonRetireGoal: 8,

  firstPersonSalaryGrowth: 0.05,
  secondPersonSalaryGrowth: 0.05,

  firstPersonPensionFund: 0,
  secondPersonPensionFund: 0,
  firstPersonComPension: 0,
  secondPersonComPension: 0,
  firstPersonPersonalPension: 0,
  secondPersonPersonalPension: 0,
  firstPersonSocialPension: 0,
  secondPersonSocialPension: 0,

  expectedReturn: 0.05,
  firstPersonPayYears: 20,
  secondPersonPayYears: 0,
  firstPersonPensionBudget: 0,
  secondPersonPensionBudget: 0,
};
