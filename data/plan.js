// ============================================================================
//  M4 计划闭环 —— 逐周复习计划（window.KB_PLAN）
//  默认骨架：由 kb.js 章节按 306 权重（内33/外23/生14/化12/病12/文6）派生。
//  替换为真实计划：直接改写下面 KB_PLAN.weeks 数组即可（结构见 README 的 M4 节）。
//  字段：week{ id,label,range,phase,books[],tasks[] }
//        task{ id,subject?,chapter?,title,note,points }
//  任务完成态存 localStorage（key=kp_<taskId>），与考点进度分离。
// ============================================================================
window.KB_PLAN = {
  meta: {
    title: "大四上 306 逐周复习计划（默认骨架）",
    note: "由现有考点库章节按权重生成；替换为真实 postgrad_plan_mingyuan.md 内容时只改 weeks 数组。",
    updated: "2026-07-25"
  },
  weeks: [
  {
    "id": "w1",
    "label": "W1",
    "range": "9月·第1周",
    "phase": "一轮·内科",
    "books": [
      "人卫第10版《内科学》循环/呼吸/消化/肾",
      "贺银成讲义 内科对应篇"
    ],
    "tasks": [
      {
        "id": "t_internal_ch1",
        "subject": "internal",
        "chapter": "internal_ch1",
        "title": "循环系统疾病",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_internal_ch2",
        "subject": "internal",
        "chapter": "internal_ch2",
        "title": "呼吸 / 消化 / 肾",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w1_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w2",
    "label": "W2",
    "range": "9月·第2周",
    "phase": "一轮·内科",
    "books": [
      "人卫第10版《内科学》内分泌",
      "贺银成讲义 内分泌篇"
    ],
    "tasks": [
      {
        "id": "t_internal_ch3",
        "subject": "internal",
        "chapter": "internal_ch3",
        "title": "内分泌系统",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 8
      },
      {
        "id": "t_w2_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w3",
    "label": "W3",
    "range": "9月·第3周",
    "phase": "一轮·内科",
    "books": [
      "人卫第10版《内科学》泌尿/风湿免疫",
      "贺银成讲义 对应篇"
    ],
    "tasks": [
      {
        "id": "t_internal_ch4",
        "subject": "internal",
        "chapter": "internal_ch4",
        "title": "泌尿系统疾病",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 4
      },
      {
        "id": "t_internal_ch5",
        "subject": "internal",
        "chapter": "internal_ch5",
        "title": "风湿免疫系统",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 6
      },
      {
        "id": "t_w3_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w4",
    "label": "W4",
    "range": "9月·第4周",
    "phase": "一轮·内科",
    "books": [
      "人卫第10版《内科学》血液系统",
      "贺银成讲义 血液篇"
    ],
    "tasks": [
      {
        "id": "t_internal_ch6",
        "subject": "internal",
        "chapter": "internal_ch6",
        "title": "血液系统",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 11
      },
      {
        "id": "t_w4_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w5",
    "label": "W5",
    "range": "10月·第1周",
    "phase": "一轮·外科",
    "books": [
      "人卫第10版《外科学》总论/创伤骨科",
      "贺银成讲义 外科总论篇"
    ],
    "tasks": [
      {
        "id": "t_surgery_ch1",
        "subject": "surgery",
        "chapter": "surgery_ch1",
        "title": "外科总论",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_surgery_ch2",
        "subject": "surgery",
        "chapter": "surgery_ch2",
        "title": "创伤与骨科",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_w5_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w6",
    "label": "W6",
    "range": "10月·第2周",
    "phase": "一轮·外科",
    "books": [
      "人卫第10版《外科学》感染/围术期",
      "贺银成讲义 对应篇"
    ],
    "tasks": [
      {
        "id": "t_surgery_ch3",
        "subject": "surgery",
        "chapter": "surgery_ch3",
        "title": "外科感染",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 5
      },
      {
        "id": "t_surgery_ch4",
        "subject": "surgery",
        "chapter": "surgery_ch4",
        "title": "围手术期处理与代谢营养",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w6_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w7",
    "label": "W7",
    "range": "10月·第3周",
    "phase": "一轮·外科",
    "books": [
      "人卫第10版《外科学》腹部损伤/消化外科",
      "贺银成讲义 消化外科篇"
    ],
    "tasks": [
      {
        "id": "t_surgery_ch5",
        "subject": "surgery",
        "chapter": "surgery_ch5",
        "title": "腹部损伤",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_surgery_ch6",
        "subject": "surgery",
        "chapter": "surgery_ch6",
        "title": "消化外科",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 7
      },
      {
        "id": "t_w7_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w8",
    "label": "W8",
    "range": "10月·第4周",
    "phase": "一轮·外科",
    "books": [
      "人卫第10版《外科学》疝/血管/肿瘤",
      "贺银成讲义 对应篇"
    ],
    "tasks": [
      {
        "id": "t_surgery_ch7",
        "subject": "surgery",
        "chapter": "surgery_ch7",
        "title": "疝与周围血管淋巴",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 5
      },
      {
        "id": "t_surgery_ch8",
        "subject": "surgery",
        "chapter": "surgery_ch8",
        "title": "肿瘤",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w8_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w9",
    "label": "W9",
    "range": "11月·第1周",
    "phase": "一轮·生理",
    "books": [
      "人卫第10版《生理学》前3章",
      "贺银成讲义 生理篇"
    ],
    "tasks": [
      {
        "id": "t_physio_ch1",
        "subject": "physio",
        "chapter": "physio_ch1",
        "title": "细胞的基本功能",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_physio_ch2",
        "subject": "physio",
        "chapter": "physio_ch2",
        "title": "血液循环",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_physio_ch3",
        "subject": "physio",
        "chapter": "physio_ch3",
        "title": "血液",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w9_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w10",
    "label": "W10",
    "range": "11月·第2周",
    "phase": "一轮·生理",
    "books": [
      "人卫第10版《生理学》循环电生理/呼吸/消化",
      "贺银成讲义 生理篇"
    ],
    "tasks": [
      {
        "id": "t_physio_ch4",
        "subject": "physio",
        "chapter": "physio_ch4",
        "title": "血液循环（电生理与血管）",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_physio_ch5",
        "subject": "physio",
        "chapter": "physio_ch5",
        "title": "呼吸",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_physio_ch6",
        "subject": "physio",
        "chapter": "physio_ch6",
        "title": "消化和吸收",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w10_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w11",
    "label": "W11",
    "range": "11月·第3周",
    "phase": "一轮·生理",
    "books": [
      "人卫第10版《生理学》能量/泌尿/神经/内分泌",
      "贺银成讲义 生理篇"
    ],
    "tasks": [
      {
        "id": "t_physio_ch7",
        "subject": "physio",
        "chapter": "physio_ch7",
        "title": "能量代谢与体温",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_physio_ch8",
        "subject": "physio",
        "chapter": "physio_ch8",
        "title": "尿的生成和排出",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_physio_ch9",
        "subject": "physio",
        "chapter": "physio_ch9",
        "title": "神经系统的功能",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_physio_ch10",
        "subject": "physio",
        "chapter": "physio_ch10",
        "title": "内分泌",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 4
      },
      {
        "id": "t_w11_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w12",
    "label": "W12",
    "range": "11月·第4周",
    "phase": "一轮·生化",
    "books": [
      "人卫第10版《生物化学》糖/基因/脂代谢",
      "贺银成讲义 生化篇"
    ],
    "tasks": [
      {
        "id": "t_biochem_ch1",
        "subject": "biochem",
        "chapter": "biochem_ch1",
        "title": "糖代谢",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_biochem_ch2",
        "subject": "biochem",
        "chapter": "biochem_ch2",
        "title": "基因信息的传递",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 4
      },
      {
        "id": "t_biochem_ch3",
        "subject": "biochem",
        "chapter": "biochem_ch3",
        "title": "脂代谢",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w12_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w13",
    "label": "W13",
    "range": "12月·第1周",
    "phase": "一轮·生化",
    "books": [
      "人卫第10版《生物化学》蛋白/氨基酸/核苷酸/肝胆",
      "贺银成讲义 生化篇"
    ],
    "tasks": [
      {
        "id": "t_biochem_ch4",
        "subject": "biochem",
        "chapter": "biochem_ch4",
        "title": "蛋白质、核酸与酶",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_biochem_ch5",
        "subject": "biochem",
        "chapter": "biochem_ch5",
        "title": "氨基酸代谢",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_biochem_ch6",
        "subject": "biochem",
        "chapter": "biochem_ch6",
        "title": "核苷酸代谢",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_biochem_ch7",
        "subject": "biochem",
        "chapter": "biochem_ch7",
        "title": "肝胆、血液与维生素",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w13_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w14",
    "label": "W14",
    "range": "12月·第2周",
    "phase": "一轮·病理",
    "books": [
      "人卫第10版《病理学》适应损伤/循环/心血管",
      "贺银成讲义 病理篇"
    ],
    "tasks": [
      {
        "id": "t_pathol_ch1",
        "subject": "pathol",
        "chapter": "pathol_ch1",
        "title": "细胞与组织的适应和损伤",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_pathol_ch2",
        "subject": "pathol",
        "chapter": "pathol_ch2",
        "title": "局部血液循环障碍 / 炎症 / 肿瘤",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_pathol_ch3",
        "subject": "pathol",
        "chapter": "pathol_ch3",
        "title": "局部血液循环障碍",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_pathol_ch4",
        "subject": "pathol",
        "chapter": "pathol_ch4",
        "title": "心血管系统疾病",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w14_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w15",
    "label": "W15",
    "range": "12月·第3周",
    "phase": "一轮·病理",
    "books": [
      "人卫第10版《病理学》呼吸/消化/泌尿生殖/传染病",
      "贺银成讲义 病理篇"
    ],
    "tasks": [
      {
        "id": "t_pathol_ch5",
        "subject": "pathol",
        "chapter": "pathol_ch5",
        "title": "呼吸系统疾病",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_pathol_ch6",
        "subject": "pathol",
        "chapter": "pathol_ch6",
        "title": "消化系统疾病",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_pathol_ch7",
        "subject": "pathol",
        "chapter": "pathol_ch7",
        "title": "泌尿、生殖与内分泌",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_pathol_ch8",
        "subject": "pathol",
        "chapter": "pathol_ch8",
        "title": "传染病与寄生虫",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 2
      },
      {
        "id": "t_w15_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  },
  {
    "id": "w16",
    "label": "W16",
    "range": "12月·第4周",
    "phase": "一轮·人文 + 二轮启动",
    "books": [
      "人卫第10版《医学人文》全章",
      "贺银成人文讲义",
      "开始二轮：错题本 + 看板复习队列"
    ],
    "tasks": [
      {
        "id": "t_humanity_ch1",
        "subject": "humanity",
        "chapter": "humanity_ch1",
        "title": "医患关系与沟通",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 4
      },
      {
        "id": "t_humanity_ch2",
        "subject": "humanity",
        "chapter": "humanity_ch2",
        "title": "医疗法律与伦理原则",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_humanity_ch3",
        "subject": "humanity",
        "chapter": "humanity_ch3",
        "title": "卫生法规与科研伦理",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_humanity_ch4",
        "subject": "humanity",
        "chapter": "humanity_ch4",
        "title": "医学心理与职业素养",
        "note": "通读考点正文 + 卡片自测 + 标记错题",
        "points": 3
      },
      {
        "id": "t_w16_drill",
        "subject": null,
        "chapter": null,
        "title": "本周真题自测 + 错题整理",
        "note": "配套真题/贺银成，做完进错题本，周末回看",
        "points": 0
      }
    ]
  }
]
};
