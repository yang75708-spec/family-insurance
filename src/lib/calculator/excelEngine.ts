/**
 * Excel Formula Engine
 * 严格匹配 Excel 的 PV, FV, PMT, SWITCH, IF, MATCH, CHOOSE 等函数
 */
export const Excel = {
  /** SWITCH(value, match1, result1, match2, result2, ..., default?) */
  SWITCH(value: unknown, ...args: unknown[]): number {
    for (let i = 0; i < args.length - 1; i += 2) {
      if (value === args[i]) return Number(args[i + 1]);
    }
    if (args.length % 2 === 1) return Number(args[args.length - 1]);
    return 0;
  },

  /** SWITCH 返回字符串版本 */
  SWITCH_S(value: unknown, ...args: unknown[]): string {
    for (let i = 0; i < args.length - 1; i += 2) {
      if (value === args[i]) return String(args[i + 1]);
    }
    if (args.length % 2 === 1) return String(args[args.length - 1]);
    return '';
  },

  IF(condition: boolean, trueVal: number, falseVal: number): number {
    return condition ? trueVal : falseVal;
  },

  IF_STR(condition: boolean, trueVal: string, falseVal: string): string {
    return condition ? trueVal : falseVal;
  },

  // Excel-like IFS: IFS(condition1, value1, condition2, value2, ..., default?)
  IFS(...args: (boolean | string | number)[]): number {
    for (let i = 0; i < args.length - 1; i += 2) {
      if (args[i]) return Number(args[i + 1]);
    }
    if (args.length % 2 === 1) return Number(args[args.length - 1]);
    return 0;
  },

  IFS_STR(...args: (boolean | string)[]): string {
    for (let i = 0; i < args.length - 1; i += 2) {
      if (args[i]) return String(args[i + 1]);
    }
    if (args.length % 2 === 1) return String(args[args.length - 1]);
    return '';
  },

  MAX(...args: number[]): number {
    return Math.max(...args);
  },

  MIN(...args: number[]): number {
    return Math.min(...args);
  },

  MATCH(value: unknown, lookupArray: unknown[]): number {
    const idx = lookupArray.indexOf(value);
    return idx >= 0 ? idx + 1 : lookupArray.length;
  },

  CHOOSE(index: number, ...args: unknown[]): number {
    const n = Math.floor(index);
    if (n >= 1 && n <= args.length) return Number(args[n - 1]);
    return 0;
  },

  // Excel PV(rate, nper, pmt, [fv], [type])
  // PV = -(pmt * (1 + rate * type) * (1 - 1/(1 + rate)^nper) / rate + fv / (1 + rate)^nper)
  PV(rate: number, nper: number, pmt: number, fv: number = 0, type: number = 0): number {
    if (rate === 0) return -(pmt * nper + fv);
    const pvifa = (1 + rate * type) * ((1 - 1 / Math.pow(1 + rate, nper)) / rate);
    return -(pmt * pvifa + fv / Math.pow(1 + rate, nper));
  },

  // Excel FV(rate, nper, pmt, [pv], [type])
  FV(rate: number, nper: number, pmt: number, pv: number = 0, type: number = 0): number {
    if (rate === 0) return -(pv + pmt * nper);
    const fvifa = (1 + rate * type) * (Math.pow(1 + rate, nper) - 1) / rate;
    return -(pv * Math.pow(1 + rate, nper) + pmt * fvifa);
  },

  // Excel PMT(rate, nper, pv, [fv], [type])
  PMT(rate: number, nper: number, pv: number, fv: number = 0, type: number = 0): number {
    if (rate === 0) return -(pv + fv) / nper;
    const pvifa = (1 + rate * type) * (Math.pow(1 + rate, nper) - 1) / rate;
    return -(pv * Math.pow(1 + rate, nper) + fv) / pvifa;
  },

  // ====== 收入/金额转化函数（对应 Excel SWITCH 映射） ======
  getIncome(val: string): number {
    return this.SWITCH(val,
      '15万以下', 7.5,
      '15-30万', 22.5,
      '30-60万', 45,
      '60-100万', 80,
      '100万以上', 200,
      '0'
    );
  },

  // 第二经济支柱收入转化（注意：100万以上 映射不同值）
  getIncomeForLife(val: string): number {
    return this.SWITCH(val,
      '15万以下', 7.5,
      '15-30万', 22.5,
      '30-60万', 45,
      '60-100万', 80,
      '100万以上', 200,
      '0'
    );
  },

  getCity(val: string): number {
    return this.SWITCH(val,
      '北上广深', 15,
      '新一线/二线', 12,
      '普通地级市', 9,
      '县城', 6,
      '0'
    );
  },

  getExpense(val: string): number {
    return this.SWITCH(val,
      '5万以下', 2.5,
      '5-10万', 7.5,
      '10-20万', 15,
      '20-50万', 35,
      '50万以上', 70,
      '0'
    );
  },

  getMortgage(val: string): number {
    return this.SWITCH(val,
      '大于等于100万', 120,
      '大于等于50万小于100万', 80,
      '无房贷', 0,
      0
    );
  },

  getMortgageP2(val: string): number {
    // 第二经济支柱用：80, 50, 0
    return this.SWITCH(val,
      '大于等于100万', 80,
      '大于等于50万小于100万', 50,
      '无房贷', 0,
      0
    );
  },

  getOtherLoan(val: string): number {
    return this.SWITCH(val,
      '20万以内', 10,
      '20-50万', 35,
      '50万以上', 60,
      '10-20万', 15,
      '无其他贷款', 0,
      0
    );
  },

  getOtherLoanP2(val: string): number {
    return this.SWITCH(val,
      '20万以内', 5,
      '20-50万', 20,
      '50万以上', 40,
      '10-20万', 10,
      '无其他贷款', 0,
      0
    );
  },

  getExpenseVal(val: string): number {
    return this.SWITCH(val,
      '5万以下', 5,
      '5-10万', 7.5,
      '10-20万', 15,
      '20-50万', 35,
      '50万以上', 60,
      0
    );
  },

  getDeposit(val: string): number {
    return this.SWITCH(val,
      '5万以下', 3,
      '5-20万', 12.5,
      '20-50万', 35,
      '50-100万', 75,
      '100万以上', 200,
      0
    );
  },

  getInvestment(val: string): number {
    return this.SWITCH(val,
      '无', 0,
      '5万以内', 2.5,
      '5-20万', 12.5,
      '20-50万', 35,
      '50万以上', 70,
      0
    );
  },

  getLifeCoverage(val: string): number {
    return this.SWITCH(val,
      '30万以内', 15,
      '30-50万', 40,
      '50万以内', 25,
      '50-100万', 75,
      '100-200万', 150,
      '200万以上', 250,
      '无', 0,
      '不清楚', 0,
      0
    );
  },

  getLifeCoverageB26(val: string): number {
    // B26 的保额映射，多了一个 ISNUMBER 判断
    return this.SWITCH(val,
      '30万以内', 15,
      '30-50万', 40,
      '50万以内', 25,
      '50-100万', 75,
      '100-200万', 150,
      '200万以上', 250,
      '无', 0,
      '不清楚', 0,
      0
    );
  },

  /** 收入弹性系数（用于医疗成本测算） */
  getIncomeElasticity(income: string): number {
    return this.SWITCH(income,
      '15万以下', 0.25,
      '15-30万', 0.4,
      '30-60万', 0.75,
      '60-100万', 0.75,
      '100万以上', 1.2,
      0.75
    );
  },

  /** 医疗费用封顶系数 */
  getMedicalCapKmax(income: string): number {
    return this.SWITCH(income,
      '15万以下', 3,
      '15-30万', 3,
      '30-60万', 3,
      '60-100万', 3,
      '100万以上', 4,
      3
    );
  },
};

// ====== 辅助函数 ======
/** Excel 的 CHOOSE(MATCH(...)) 模式，用于稳定性系数 Kjob
 *  系数值按修订版Excel「分行业工资参考」建议Kjob分配：
 *  非常稳定(公务员/国企/事业)→0.95，较稳定(大型企业核心岗)→0.85，
 *  一般(中小企/绩效占比高)→0.70，不稳定(自由职业/创业/销售)→0.55
 *  含义：收入越稳定，未来收入计入PV的比例越高
 */
export function getJobStabilityFactor(stability: string): number {
  const match = Excel.MATCH(stability, [
    '非常稳定（例如：公务员/国企/事业单位）',
    '较稳定（例如：大型企业核心岗）',
    '一般（例如：中小企/绩效占比高）',
    '不稳定（例如：自由职业/创业/销售）'
  ]);
  return Excel.CHOOSE(match, 0.95, 0.85, 0.70, 0.55);
}

/** 身体状况自评系数（优/良/差）→ 保费系数 */
export function getHealthStatusCoeff(status: string): number {
  return Excel.SWITCH(status, '优', 1.0, '良', 1.5, '差', 2.0, 1.0);
}

/** Excel L8 = CHOOSE(MATCH(D6,...),...) + CHOOSE(MATCH(D7,...),...) */
export function getLiquidAsset(deposit: string, investment: string): number {
  const depArr = ['5万以下', '5-20万', '20-50万', '50-100万', '100万以上'];
  const invArr = ['无', '5万以内', '5-20万', '20-50万', '50万以上'];
  const depVal = Excel.CHOOSE(Excel.MATCH(deposit, depArr), 2.5, 12.5, 35, 75, 200);
  const invVal = Excel.CHOOSE(Excel.MATCH(investment, invArr), 0, 2.5, 12.5, 35, 70);
  return depVal + invVal;
}
