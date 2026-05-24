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
 *   健康险参数：
 *   H9  = IF(D9="北上深",80,IF(D9="二线城市",50,IF(D9="普通地级市",30,30)))
 *   H10 = IF(B5="15万以下",0.25,IF(B5="15-30万",0.4,IF(B5="100万以上",1.5,0.75)))
 *   H11 = IF(B5="100万以上",5,3)
 *   H12 = MIN(H9+L1*H10, H11*H9)
 *   H13 = IF(D9="北上深",7,IF(D9="二线城市",7,6))
 *   H14 = IF(L1<10,0.9,IF(L1<30,0.7,0.5))
 *   H15 = IF(D9="北上深",1.2,IF(D9="二线城市",1,IF(D9="普通地级市",0.8,0.6)))
 *   H16 = MIN(H12,L2*H13)*0.5*H14*H15
 *   H17 = MAX(0,H12-H16-D14)
 *   H18 = CHOOSE(MATCH(B7,{...}),0.7,1,1.4,1.6)
 *   H19 = IF(B3<30,0.065,IF(B3<40,0.04,IF(B3<50,0.02,0.005)))
 *   H20 = B42-B3
 *   H21 = L1*(1-((1+H19)/(1+L3))^L7)/(L3-H19)*H18
 *   H23 = L4*(1-((1+L5)/(1+L3))^L7)/(L3-L5)*L6
 *   H24 = MAX(0,H21+H23-C14-L8)
 *   H25 = IF(B3>=50,0.065,IF(B3>=40,0.04,IF(B3>=30,0.025,IF(B3>=20,0.015,0))))
 *
 *   第一经济支柱输出：
 *   B3  = H21+H23
 *   B4  = H24
 *   B5  = H12
 *   B6  = H17
 *   B7  = B4+B6
 *   D3  = IF(B14="社保医保","百万医疗",IF(B14="百万医疗","中端医疗","无"))
 *   D4  = B4*H25
 *   D5  = 0.1
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
 */
