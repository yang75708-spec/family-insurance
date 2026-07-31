/**
 * =============================================
 *  Excel 单元格映射表 — 家庭保险配置决策工具
 * =============================================
 *
 * 所有公式严格对应 Excel《家庭保险决策表》和《用户端》Sheet
 * 本文件供维护者回溯公式来源、校验逻辑、与 Excel 对照
 *
 * ============ 用户端 Sheet ============
 *   B3  ←  firstPersonAge
 *   B4  ←  secondPersonAge
 *   B5  ←  firstPersonIncome
 *   B6  ←  secondPersonIncome
 *   B7  ←  incomeStability
 *   B8  ←  childCount
 *   B9  ←  parentSupportCount
 *   B10 ←  childAge
 *   D3  ←  mortgageBalance
 *   D4  ←  mortgageYears
 *   D5  ←  otherLoanAmount
 *   D6  ←  bankDeposit
 *   D7  ←  lowRiskInvestment
 *   D8  ←  annualExpense
 *   D9  ←  city
 *   D10 = MAX(0,63-B3)
 *   G2  = MAX(0,63-B4)
 *   G3  = MAX(0,22-B10)
 *   G4  = MIN(D10,G3)
 *   G5  = MIN(G2,G3)
 *   G6  = 20
 *   G7  = 0.03
 *   G8  = 0.05
 *   G9  = 0.8
 *
 *   健康险：
 *   B14 ← firstPersonHealthIns
 *   B15 ← secondPersonHealthIns
 *   B16 ← childHealthIns
 *   B17 ← parentHealthIns
 *   C14 ← firstPersonCIExisting
 *   C15 ← secondPersonCIExisting
 *   C16 ← childCIExisting
 *   C17 ← parentCIExisting
 *   D14 ← firstPersonMIExisting
 *   D15 ← secondPersonMIExisting
 *   D20 ← firstPersonCIPremiumBudget
 *   E20 ← firstPersonMIPremiumBudget
 *   D21 ← secondPersonCIPremiumBudget
 *   E21 ← secondPersonMIPremiumBudget
 *   （新版健康险）身体状况自评：优/良/差 —— 驱动期望医疗消费档位 + 保费系数
 *   （新版健康险）p1_期望医疗消费档位 / p2_期望医疗消费档位：A/B/C
 *   （新版健康险）familyCoefficient：家庭系数（保守/稳健/进取 → α=0.3/0.5/0.6）
 *
 *   寿险：
 *   B28 ← firstPersonLifeIns
 *   B29 ← secondPersonLifeIns
 *   B30 ← childParentLifeIns
 *   D28 ← firstPersonLifeCoverage
 *   D29 ← secondPersonLifeCoverage
 *   B35 ← firstPersonLifeTerm
 *   B36 ← secondPersonLifeTerm
 *   D35 ← firstPersonLifeBudget
 *   D36 ← secondPersonLifeBudget
 *
 *   养老金：
 *   B42 ← firstPersonRetireAge
 *   B43 ← secondPersonRetireAge
 *   C42 ← firstPersonRetireYears
 *   C43 ← secondPersonRetireYears
 *   D42 ← firstPersonRetireGoal
 *   D43 ← secondPersonRetireGoal
 *   B46 ← firstPersonPensionFund
 *   B47 ← secondPersonPensionFund
 *   C46 ← firstPersonComPension
 *   C47 ← secondPersonComPension
 *   D46 ← firstPersonPersonalPension
 *   D47 ← secondPersonPersonalPension
 *   E46 ← firstPersonSocialPension
 *   E47 ← secondPersonSocialPension
 *   B49 ← expectedReturn
 *   B52 ← firstPersonPayYears
 *   B53 ← secondPersonPayYears
 *   D52 ← firstPersonPensionBudget
 *   D53 ← secondPersonPensionBudget
 *
 * ============ 家庭保险决策表 Sheet ============
 *   L1  = SWITCH(B5,"15万以下",7.5,"15-30万",22.5,"30-60万",45,...)
 *   M1  = SWITCH(B6,...)
 *   L2  = SWITCH(D9,"北上深",15,"二线城市",12,"普通地级市",9,"县城",6)
 *   L3  = 0.05
 *   L4  = SWITCH(D8,"5万以下",2.5,"5-10万",7.5,...)
 *   L5  = 0.025
 *   L6  = L1/(L1+M1)
 *   M6  = 1-L6
 *   L7  = IF((B42-B3)<=4, B42-B3, 4)
 *   M7  = IF((B43-B4)<=4, B43-B4, 4)
 *   L8  = CHOOSE(MATCH(D6,...),...)+CHOOSE(MATCH(D7,...),...)
 *
 *   健康险参数（新版，对应《健康险公式总体思路及参数说明.docx》）：
 *   g  = 0.028（全国平均工资增速）；r = 0.0219（30年期国债收益率，健康险PV折现率）
 *   收入法PV_i = income_i × (1-((1+g)/(1+r))^5)/(r-g) × Kjob_i
 *   需求法PV_i = (债务覆盖 + 子女教育金 + 家庭生活支出) × 收入占比（5年）
 *   重症基础花销 = 一线/新一线 50万；二线及以下 30万
 *   已有重疾保额_i = MAX(手动保额, 勾选重疾险?30:0)
 *   重疾缺口_i = MAX(0, (收入法PV + 需求法PV)/2 + 重症基础花销 - 已有重疾保额)
 *   期望医疗消费_i = 城市×身体状况自评(优/良/差)×档位(A/B/C) 区间中值
 *   医疗险覆盖_i = MAX(手动医疗保额, 勾选险种有效保额)
 *   医疗缺口_i = MAX(0, 期望医疗消费 - 医疗险覆盖)
 *   α = 家庭系数（保守0.3/稳健0.5/进取0.6）
 *   健康险整体缺口 = MAX(0, (重疾1+医疗1) + (重疾2+医疗2) - 流动资产×α)
 *   Kjob = CHOOSE(MATCH(B7,{...}),0.95,0.85,0.70,0.55)
 *   重疾费率 = 费率表(年龄×性别)；健康状况系数 优1.0/良1.5/差2.0
 *
 *   第一经济支柱输出：
 *   B3  = 重疾建议保额 = (收入法PV + 需求法PV)/2 + 重症基础花销
 *   B4  = 重疾缺口 = MAX(0, B3 - 已有重疾保额)
 *   B5  = 期望医疗消费（万元/年）
 *   B6  = 医疗缺口 = MAX(0, 期望医疗消费 - 医疗险覆盖)
 *   B7  = B4+B6（单支柱健康险总缺口；流动资产×α 在汇总统一抵扣）
 *   D3  = 医疗险推荐类型（基于期望医疗消费与医疗缺口）
 *   D4  = B4×重疾费率×健康状况系数
 *   D5  = 医疗险预估保费
 *   D6  = D4+D5
 *   D7  = IF(D6<=(D20+E20),"✅预算充足","⚠️预算不足")
 *
 *   第一经济支柱寿险：
 *   B9  = MAX(MAX(0,...), MAX(0,...))  — 两方法取大
 *   B10 = D28
 *   B11 = MAX(0,B9-IF(...))
 *   D9  = B11*10
 *   D10 = IF(D9<=D35,"✅...","⚠️...")
 *   D11 = IF(B35="63岁","推荐配置定期寿险至63岁","推荐配置至65岁或终身")
 *
 *   第一经济支柱养老金：
 *   H3  = D42*(0.03+1)^(B42-B3)
 *   H4  = PV(0.05,C42,-H3,0,1)
 *   H5  = FV(0.05,B42-B3,0,-B46,0)+FV(0.05,B42-B3,0,-C46,0)+FV(0.05,B42-B3,0,-D46,0)+PV(0.05,C42,-E46*12,0,1)
 *   H6  = MAX(0,H4-H5)
 *   B13 = PMT(0.05,B52,0,-H6,1)
 *   B14 = H5
 *   B15 = D42
 *   D13 = H6
 *   D14 = B52
 *   D15 = IF(B13<=D52,"✅预算充足","⚠️预算不足...")
 *
 *   第二经济支柱同理 (B18-B30, I列)
 *   子女: B33-B44, D33-D44
 *   父母: B47-B58, D47-D58
 *   汇总：健康险整体缺口 = MAX(0, 第一支柱(B7) + 第二支柱(B22) - 流动资产×α)
 */
