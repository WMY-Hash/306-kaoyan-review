// =====================================================================
// 知识星图种子库（M6）— window.KB_GRAPH
// 数据形态：nodes[] + links[]，节点按 6 科着色、可网状互联。
// 用户可在页内自由编辑（新增 / 连边 / 修改 / 删除），编辑存浏览器本地，
// 不影响此种子文件。详见 README「M6 知识星图」。
// =====================================================================
window.KB_GRAPH = {
  meta: {
    updated: "2026-07-24",
    note: "知识星图种子库：把分散考点连成可漫游的记忆网络。节点 group 取值 = 6 科科目 id（内/外/生/化/病/人文）。节点 refs 可回链 M1 考点（p_xxx），点击「查看考点」直接跳转。",
    totalNodes: 32,
    totalEdges: 0
  },

  // ===== 节点 =====
  nodes: [
    // —— 生理学 physio ——
    { id: "n_physio_ap", name: "动作电位", group: "physio", tags: ["神经", "心肌", "兴奋性"],
      body: "可兴奋细胞受刺激后膜电位快速去极化+复极化的过程。上升支由 Na⁺ 内流（快反应细胞）或 Ca²⁺ 内流（慢反应细胞）形成，复极依赖 K⁺ 外流。是兴奋传导与递质/激素释放的电学基础。",
      refs: [] },
    { id: "n_physio_co", name: "心输出量", group: "physio", tags: ["循环", "CO", "每搏量"],
      body: "每分钟一侧心室射血量 = 每搏量 × 心率。受前负荷（回心血量）、后负荷（动脉压）、心肌收缩力与心率调节。是循环功能的核心指标。",
      refs: [] },
    { id: "n_physio_bp", name: "动脉血压调节", group: "physio", tags: ["循环", "血压", "压力感受性反射"],
      body: "短期靠压力感受性反射（减压反射）与体液因素（肾上腺素、AngⅡ、血管升压素）；长期靠肾-体液控制（钠水潴留 vs 排钠）。平均动脉压 ≈ 心输出量 × 总外周阻力。",
      refs: [] },
    { id: "n_physio_po2", name: "氧解离曲线", group: "physio", tags: ["呼吸", "血氧", "Hb"],
      body: "血氧饱和度与 PO₂ 的关系曲线，呈 S 形。左移（亲和力↑）：pH↑、PCO₂↓、温度↓、2,3-DPG↓；右移（释放 O₂↑）：酸中毒、高 CO₂、高热、高 2,3-DPG——利于组织获氧。",
      refs: [] },
    { id: "n_physio_gfr", name: "肾小球滤过率", group: "physio", tags: ["泌尿", "GFR", "滤过"],
      body: "单位时间内两肾生成的超滤液量，正常约 125 ml/min。有效滤过压 = 肾小球毛细血管压 − (血浆胶渗压 + 囊内压)。GFR 下降是肾功能受损的早期信号。",
      refs: [] },
    { id: "n_physio_insulin", name: "胰岛素分泌调节", group: "physio", tags: ["内分泌", "糖", "β细胞"],
      body: "血糖升高是最强刺激；胃肠激素（GLP-1、GIP）、迷走神经、氨基酸也促进分泌。β 细胞葡萄糖代谢→ATP/ADP↑→KATP 关闭→去极化→Ca²⁺ 内流→胞吐。",
      refs: [] },

    // —— 生物化学 biochem ——
    { id: "n_biochem_glycolysis", name: "糖酵解", group: "biochem", tags: ["糖代谢", "ATP", "关键酶"],
      body: "胞浆中葡萄糖→2 丙酮酸，净产 2 ATP + 2 NADH。关键酶：己糖激酶、磷酸果糖激酶-1（最重要限速）、丙酮酸激酶。无氧时丙酮酸→乳酸。",
      refs: ["p_biochem_001"] },
    { id: "n_biochem_tca", name: "三羧酸循环", group: "biochem", tags: ["糖代谢", "生物氧化", "乙酰CoA"],
      body: "线粒体基质内乙酰 CoA 彻底氧化生成 2 CO₂，产 3 NADH + 1 FADH₂ + 1 GTP。是糖脂蛋白代谢的共同最终通路，关键酶柠檬酸合酶、异柠檬酸脱氢酶、α-酮戊二酸脱氢酶。",
      refs: [] },
    { id: "n_biochem_fa", name: "脂肪酸 β-氧化", group: "biochem", tags: ["脂代谢", "肉碱", "乙酰CoA"],
      body: "脂肪酸活化成脂酰 CoA 后经肉碱穿梭入线粒体，β 位反复氧化生成乙酰 CoA + NADH + FADH₂。肝中乙酰 CoA 过多时缩合为酮体。",
      refs: ["p_biochem_006"] },
    { id: "n_biochem_gng", name: "糖异生", group: "biochem", tags: ["糖代谢", "饥饿", "乳酸"],
      body: "肝（肾少量）由乳酸、生糖氨基酸、甘油合成葡萄糖，维持血糖。需绕过糖酵解 3 个不可逆步骤，关键酶丙酮酸羧化酶、PEP 羧激酶等。受胰高血糖素/胰岛素调节。",
      refs: [] },
    { id: "n_biochem_ketone", name: "酮体生成", group: "biochem", tags: ["脂代谢", "饥饿", "酸中毒"],
      body: "肝线粒体中乙酰 CoA 缩合为乙酰乙酸、β-羟丁酸、丙酮。长期饥饿/糖尿病时大量生成，超过肝外利用→酮血症、酮尿、代谢性酸中毒。",
      refs: [] },

    // —— 病理学 pathol ——
    { id: "n_pathol_infl", name: "炎症", group: "pathol", tags: ["基本病理", "渗出", "介质"],
      body: "机体对损伤的防御反应，特征红热肿痛功能障碍。血管反应（扩张、通透性↑）+ 白细胞渗出（中性粒细胞急性、单核细胞/淋巴细胞慢性）。介质：组胺、前列腺素、细胞因子、补体。",
      refs: [] },
    { id: "n_pathol_athero", name: "动脉粥样硬化", group: "pathol", tags: ["心血管", "LDL", "斑块"],
      body: "内皮损伤后脂质（尤其 ox-LDL）沉积于内膜，单核/平滑肌细胞参与形成脂质条纹→纤维斑块→粥样斑块。易损斑块破裂诱发血栓。是心脑血管病共同病理基础。",
      refs: ["p_pathol_017"] },
    { id: "n_pathol_thrombus", name: "血栓形成", group: "pathol", tags: ["凝血", "Virchow", "梗死"],
      body: "活体心血管内血液成分凝成固体质块。Virchow 三要素：内皮损伤、血流缓慢/涡流、血液高凝。可阻塞血管、脱落后栓塞、或诱发 DIC。",
      refs: [] },
    { id: "n_pathol_neoplasia", name: "肿瘤", group: "pathol", tags: ["增殖", "异型性", "转移"],
      body: "细胞异常无序增殖，分化障碍。异型性（结构/细胞）是良恶性鉴别依据；转移（淋巴/血行/种植）是恶性标志。发生是多基因、多阶段累积突变的结果。",
      refs: ["p_pathol_017"] },
    { id: "n_pathol_apop", name: "细胞凋亡", group: "pathol", tags: ["程序性死亡", "Caspase"],
      body: "基因调控的主动性细胞死亡，不引起炎症。Caspase 级联执行，形态皱缩、凋亡小体。生理（发育、老化细胞清除）与病理（肿瘤逃逸、缺血）均参与。",
      refs: [] },

    // —— 内科学 internal ——
    { id: "n_internal_chf", name: "心力衰竭", group: "internal", tags: ["循环", "心室重构", "BNP"],
      body: "各种心脏结构/功能异常致心室充盈或射血能力受损，表现为呼吸困难、乏力、液体潴留。分型按部位（左/右/全）、速度（急/慢）、LVEF（射血/保留）。BNP 升高有助诊断。",
      refs: ["p_internal_001"] },
    { id: "n_internal_mi", name: "心肌梗死", group: "internal", tags: ["冠脉", "STEMI", "再灌注"],
      body: "冠脉急性闭塞致心肌缺血坏死。绝大多数因动脉粥样硬化斑块破裂+血栓。ST 段抬高型（STEMI）需尽早再灌注（PCI/溶栓）。标志物 CK-MB、肌钙蛋白升高。",
      refs: [] },
    { id: "n_internal_ckd", name: "慢性肾脏病", group: "internal", tags: ["泌尿", "eGFR", "尿毒症"],
      body: "肾损害或 eGFR<60 持续 ≥3 月。分期按 eGFR（1–5 期）。并发症：肾性高血压、贫血、骨病、代谢性酸中毒。终末期需肾脏替代（透析/移植）。",
      refs: [] },
    { id: "n_internal_dm", name: "糖尿病", group: "internal", tags: ["内分泌", "胰岛素", "并发症"],
      body: "胰岛素分泌/作用缺陷致慢性高血糖。1 型自身免疫β细胞破坏；2 型胰岛素抵抗为主。慢性并发症：微血管（视网膜/肾/神经）、大血管（_AS)、神经病变。诊断：空腹血糖/OGTT/HbA1c。",
      refs: [] },
    { id: "n_internal_ra", name: "类风湿关节炎", group: "internal", tags: ["风湿免疫", "自身抗体", "滑膜炎"],
      body: "以对称性多关节滑膜炎为主的自身免疫病。RF、抗 CCP 抗体阳性。晨僵>1h、小关节受累、影像学侵蚀。治疗目标达标（DMARDs，如甲氨蝶呤）。",
      refs: ["p_internal_019"] },
    { id: "n_internal_dic", name: "弥散性血管内凝血", group: "internal", tags: ["凝血", "出血", "血栓"],
      body: "致病因素激活凝血系统，全身微血栓 + 凝血因子消耗，继发纤溶亢进→出血。常见病因：感染、恶性肿瘤、创伤、产科意外。实验室：PLT↓、PT/APTT↑、D-二聚体↑、FDP↑。",
      refs: ["p_internal_035"] },

    // —— 外科学 surgery ——
    { id: "n_surgery_asepsis", name: "无菌术", group: "surgery", tags: ["总论", "消毒", "手术"],
      body: "针对微生物的手术预防原则，包括灭菌（物理消灭所有微生物）与消毒（杀灭病原）。洗手、穿无菌衣、铺巾、器械管理是基础，是预防 SSI 的核心。",
      refs: ["p_surgery_001"] },
    { id: "n_surgery_sepsis", name: "外科感染与脓毒症", group: "surgery", tags: ["感染", "SIRS", "脓液"],
      body: "病菌侵入组织引起的炎症反应；脓毒症=感染+SIRS（体温、心率、呼吸、白细胞异常）。严重脓毒症伴器官功能障碍。处理：引流脓肿 + 抗菌 + 支持。",
      refs: [] },
    { id: "n_surgery_acs", name: "急性胰腺炎", group: "surgery", tags: ["急腹症", "胰酶", "Cullen"],
      body: "胰酶异常激活致胰腺自体消化。胆石与酒精最常见。表现上腹痛向腰背放射、腹胀；重症见 Grey-Turner/Cullen 征、胰腺坏死。淀粉酶/脂肪酶升高。",
      refs: ["p_surgery_021"] },
    { id: "n_surgery_hernia", name: "腹股沟疝", group: "surgery", tags: ["腹外疝", "斜疝", "直疝"],
      body: "腹腔内容物经腹股沟区突出。斜疝经腹股沟管深环→皮下环（可入阴囊），直疝由直疝三角突出（不入阴囊）。治疗：无张力疝修补（补片）。",
      refs: ["p_surgery_023"] },
    { id: "n_surgery_shock", name: "休克", group: "surgery", tags: ["循环", "灌注", "容量"],
      body: "有效循环血量锐减致组织灌注不足、细胞缺氧。分低血容量、感染、心源、过敏、神经源性。代偿：心率↑、外周收缩；失代偿：血压↓、酸中毒、MODS。",
      refs: [] },
    { id: "n_surgery_onco", name: "肿瘤外科治疗", group: "surgery", tags: ["肿瘤", "切除", "活检"],
      body: "以手术切除为核心，强调整块切除+区域淋巴结清扫（根治术）。原则：不切割肿瘤、防种植、足够切缘。结合术前术后放化疗（综合治疗）。活检是诊断前提。",
      refs: [] },

    // —— 人文医学 humanity ——
    { id: "n_humanity_stress", name: "应激与心身疾病", group: "humanity", tags: ["心理", "GAS", "心身"],
      body: "应激是机体对刺激的非特异性反应（Selye 一般适应综合征：警觉-抵抗-衰竭）。长期应激与高血压、消化性溃疡、免疫低下相关，属心身疾病范畴。",
      refs: ["p_humanity_013"] },
    { id: "n_humanity_consent", name: "知情同意", group: "humanity", tags: ["伦理", "自主权", "告知"],
      body: "医疗决策前医务人员充分告知病情、方案、风险与替代选择，患者自愿同意。是尊重患者自主权与医学伦理的核心要求，也是法律义务。",
      refs: [] },
    { id: "n_humanity_ethics", name: "医学伦理原则", group: "humanity", tags: ["伦理", "四原则"],
      body: "四大原则：尊重自主（autonomy）、不伤害（non-maleficence）、行善（beneficence）、公正（justice）。临床决策与科研伦理共同底线。",
      refs: [] },
    { id: "n_humanity_comm", name: "医患沟通", group: "humanity", tags: ["沟通", "信任", "纠纷"],
      body: "医务人员与患者间信息、情感交流。良好沟通提升依从性与信任、降低纠纷。技巧：倾听、共情、用通俗语言、共同决策。",
      refs: [] }
  ],

  // ===== 边（无向/有向均可，type 标注关系）=====
  links: [
    // 生化内部代谢网
    { source: "n_biochem_glycolysis", target: "n_biochem_tca", type: "衔接", label: "丙酮酸→乙酰CoA 入三羧酸循环" },
    { source: "n_biochem_fa", target: "n_biochem_ketone", type: "产物", label: "乙酰CoA 过多→酮体" },
    { source: "n_biochem_glycolysis", target: "n_biochem_gng", type: "对抗", label: "糖酵解与糖异生互为反向调控" },
    { source: "n_physio_insulin", target: "n_biochem_glycolysis", type: "促进", label: "胰岛素促进糖酵解" },
    { source: "n_physio_insulin", target: "n_biochem_gng", type: "抑制", label: "胰岛素抑制糖异生" },
    { source: "n_biochem_fa", target: "n_physio_insulin", type: "抵抗", label: "脂毒性和游离脂肪酸促胰岛素抵抗" },

    // 生理→病理/临床
    { source: "n_physio_ap", target: "n_physio_co", type: "机制", label: "心肌电活动驱动收缩" },
    { source: "n_physio_ap", target: "n_physio_insulin", type: "机制", label: "β细胞去极化触发胰岛素释放" },
    { source: "n_physio_co", target: "n_physio_bp", type: "决定", label: "CO 是平均动脉压的决定因素" },
    { source: "n_physio_bp", target: "n_internal_chf", type: "病因", label: "长期高血压致后负荷↑→心衰" },
    { source: "n_physio_gfr", target: "n_internal_ckd", type: "指标", label: "GFR 下降定义 CKD" },
    { source: "n_physio_po2", target: "n_internal_mi", type: "关联", label: "心肌缺血缺氧加重氧供需失衡" },
    { source: "n_physio_po2", target: "n_internal_chf", type: "关联", label: "肺淤血影响氧合" },

    // 病理→临床
    { source: "n_pathol_athero", target: "n_internal_mi", type: "病因", label: "斑块破裂+血栓→心梗" },
    { source: "n_pathol_athero", target: "n_pathol_thrombus", type: "并发", label: "斑块破裂处血栓形成" },
    { source: "n_pathol_athero", target: "n_internal_ckd", type: "病因", label: "肾动脉粥样→肾血管性高血压/CKD" },
    { source: "n_pathol_athero", target: "n_internal_dm", type: "共病", label: "糖尿病加速动脉粥样硬化" },
    { source: "n_internal_dm", target: "n_pathol_athero", type: "病因", label: "高血糖促 ox-LDL 沉积" },
    { source: "n_internal_dm", target: "n_internal_ckd", type: "并发症", label: "糖尿病肾病是 CKD 主因" },
    { source: "n_pathol_infl", target: "n_pathol_athero", type: "机制", label: "慢性炎症驱动斑块" },
    { source: "n_pathol_infl", target: "n_pathol_neoplasia", type: "机制", label: "慢性炎症促肿瘤" },
    { source: "n_pathol_infl", target: "n_internal_ra", type: "机制", label: "自身免疫性滑膜炎" },
    { source: "n_pathol_infl", target: "n_surgery_sepsis", type: "机制", label: "感染诱发炎症瀑布" },
    { source: "n_pathol_neoplasia", target: "n_pathol_apop", type: "机制", label: "肿瘤逃逸凋亡" },
    { source: "n_pathol_neoplasia", target: "n_surgery_onco", type: "治疗", label: "恶性肿瘤需外科切除" },
    { source: "n_pathol_thrombus", target: "n_internal_dic", type: "并发", label: "血栓播散/消耗→DIC" },
    { source: "n_internal_dic", target: "n_pathol_thrombus", type: "双向", label: "DIC 既血栓又出血" },

    // 外科相关
    { source: "n_surgery_asepsis", target: "n_surgery_sepsis", type: "预防", label: "无菌术预防 SSI/脓毒症" },
    { source: "n_surgery_sepsis", target: "n_surgery_shock", type: "并发", label: "严重脓毒症→感染性休克" },
    { source: "n_surgery_acs", target: "n_surgery_shock", type: "并发", label: "重症胰腺炎→休克" },
    { source: "n_surgery_shock", target: "n_physio_bp", type: "表现", label: "休克时血压骤降" },
    { source: "n_surgery_hernia", target: "n_surgery_onco", type: "鉴别", label: "疝需与淋巴结/肿瘤鉴别" },

    // 人文相关
    { source: "n_humanity_ethics", target: "n_humanity_consent", type: "包含", label: "知情同意是自主原则体现" },
    { source: "n_humanity_ethics", target: "n_humanity_comm", type: "支撑", label: "沟通落实伦理原则" },
    { source: "n_humanity_consent", target: "n_surgery_onco", type: "前提", label: "手术/活检前须知情同意" },
    { source: "n_humanity_consent", target: "n_internal_ra", type: "前提", label: "DMARDs 治疗须告知" },
    { source: "n_humanity_stress", target: "n_physio_bp", type: "机制", label: "应激促血压升高" },
    { source: "n_humanity_stress", target: "n_humanity_comm", type: "关联", label: "应激影响医患互动" }
  ]
};
