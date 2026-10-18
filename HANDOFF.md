# 交接文档 HANDOFF（2026-10-18，下午更新）

给接手的 Claude Code：这份文档总结了到目前为止的全部决定、现状和待办。请先读完再动手。
用户是 LUO ZI YAN（PolyU BSE3716 毕业论文，项目编号 FX02，导师 Fu XIAO），交流用中文。

---

## 1. 项目一句话

在一间真实教室里重复采集同一批同学的热感觉投票，比较三种热舒适模型，再把模型接到
EnergyPlus 里的空调控制器上，看个性化能不能在同等舒适下省电。

| 模型 | 内容 | brms 写法（草案） |
|---|---|---|
| Model A | 线性回归，把 7 点投票当连续数（常见做法） | `tsv_num ~ top + clo + activity + rh` |
| Model B | 群体累积 probit 序数模型（Favero et al. 2023 的做法） | `tsv ~ top + clo + activity + rh`, `cumulative("probit")` |
| Model C | 分层序数模型：每人有阈值偏移 u_j、温度敏感度 v_j、尺度 s_j（部分汇集） | `bf(tsv ~ top + clo + activity + rh + (1 + top | participant), disc ~ 0 + (1 | participant))` |

注意：`disc` 的截距不能自由估计（和阈值不可同时识别），必须写 `disc ~ 0 + ...`。
`R/00_smoke_test.R` 已改为 `disc ~ 0 + (1 | occ)`（10/18），和 `ordinal::clmm` 的估计一致。

三个控制器（EnergyPlus，Python API）：1 固定 PMV 设定点；2 基于 Model B；3 基于 Model C
（在场者平均预测不满意率 ≤ 10% 时选最省电的设定点）。舒适度用 PMV、Model B、Model C
三种标准交叉评估。核心产出之一是 **break-even**：每人要投几票，Model C 才比 Model B 预测得更准
（按时间顺序，每人最后 6 票做测试集，用前 n = 2, 4, …, 14 票训练）。

## 2. 现状

| 部分 | 状态 | 位置 |
|---|---|---|
| 修订版 proposal | 完成（10/15 版），**还需按第 3 节的新决定再改一次** | `proposal/`（`node build.js out.docx` 重新生成，需要 npm 包 `docx`） |
| R/brms 环境 + Favero 复现 | 完成，44 个参数误差 ≤ 0.005，LOOIC 一致 | `R/`、`output/` |
| 在线问卷网页 | 已上线（GitHub Pages，分支 `survey-site`，目录 `/docs`） | `docs/index.html` |
| 问卷后台（Google Apps Script → Google 表格） | **已通**（10/18 用户扫码投票，`/exec` 显示 `votes: 1`） | `survey/apps_script.gs`、`survey/README.md` |
| 二维码 | 完成（10/18 重新生成，高容错 H 级、1200 px，已解码验证指向问卷网址） | `survey/vote_qr.png` |
| Microsoft Forms 备用方案 | 导入用 Word 文件（已不用，留作备份） | `survey/msforms_backup/` |

- 问卷网址：<https://auz223243-hub.github.io/final-year-project/>（加 `?preview` 为测试模式，不发送数据）
- Apps Script 网页应用部署 ID：`AKfycbyjZ_6y88BAOvnpLxH1QasDTIQf2sZeYAoN4GDbrCcb2e3atyM9NVYW1wYa_WHkG3mF`
  - `/exec` 网址：`https://script.google.com/macros/s/AKfycbyjZ_6y88BAOvnpLxH1QasDTIQf2sZeYAoN4GDbrCcb2e3atyM9NVYW1wYa_WHkG3mF/exec`（已写进 `docs/index.html` 的 `CONFIG.ENDPOINT`）
- Apps Script 项目 ID（scriptId，从用户给的库链接得到）：`1R1MZJLTFoITGdBC9KyllHrjoZpX37rndtAuYM1Yl9IKt-vVeTzoEWKmM`
- Google 账号：auz223243@gmail.com

### 问卷后台：问题与修复记录（10/18 已解决）

- **原因**：Apps Script 项目是在 script.google.com 直接新建的（不绑定表格）。旧代码（版本 1）带
  `@OnlyCurrentDoc` 并用 `getActiveSpreadsheet()`，在独立项目里返回 null，`/exec` 报
  `Cannot read properties of null (reading 'getSheetByName')`。
- **修复**：新版 `survey/apps_script.gs` 在没有绑定表格时自动新建 "Classroom Comfort Votes" 表格，
  ID 存在 Script Properties 的 `SHEET_ID`。用 clasp 3.4.1 核对过：网页应用部署 `AKfycbyjZ_6y…` 指向
  **版本 2**，和仓库里的 `apps_script.gs` 逐字相同；另一个 `@HEAD` 部署是每个项目自带的开发部署，不用管。
  最后一步是用户本人打开 `/exec` 授予表格读写权限（这一步任何工具都替代不了）。
- **验收**：用户扫码投了一票，`/exec` 返回 `votes: 1`。
- **待用户自己做**：①在表格里删掉这条测试行（第 2 行；第 1 行表头保留）；②表格"文件 → 设置 → 时区"
  确认为 GMT+08:00 Hong Kong（`server_time` 按表格时区显示，之后要和传感器时间对齐）；
  ③到 <https://myaccount.google.com/permissions> 撤销 clasp 授权。
- **云端会话的限制**：`script.google.com` 和 `*.github.io` 被网络策略拦截，没法直接测试 `/exec` 或线上页面；
  `script.googleapis.com` 等 API 可以访问。clasp 的授权里没有 Sheets 权限，所以读不了也删不了表格行。
  **不要**为了远程删行给后台加管理接口：密钥写在公开网页里，谁都能调用。
- **以后改后台代码**：在 `survey/` 目录用 clasp 推送（`.clasp.json`、`appsscript.json`、`.claspignore` 已配好），
  步骤见 `survey/README.md`。关键是**更新原部署**（clasp 2.4.2：`deploy -i <部署ID>`；clasp 3：
  `redeploy <部署ID>`），不要新建部署，否则网址和二维码都会变。

**问卷数据列核对（10/18）**：用无头浏览器以 `?preview` 跑了首次投票和同一手机再次投票两种流程，
18 列全部有值。必答题（座位、热感觉、偏好、可接受度、活动）不选不能前进；衣物至少选 1 件；
`sun/draught/stuffy` 未勾选记 0；`self_sens` 首次填写后每行都带。**唯一合法留空的列是 `clo_tbc`**
（只有选了没有标准 clo 值的"羽絨"或"圍巾"时才有内容）。`version = 2026-10-18` 的行来自当前版本。

注意：页面用 `fetch(..., {mode: "no-cors"})` 发送，读不到服务器回复；断网时投票会存在手机
`localStorage`（`ccv_queue`），下次打开页面自动补发；每票带唯一 `sid`，服务器用 CacheService
去重（6 小时内）。`KEY = fyp-ccv-2026` 在页面和脚本里必须一致。

## 3. 已和用户/导师确定的决定（覆盖 proposal 和旧问卷文档里不一致的地方）

- **伦理**：导师说只做匿名问卷不用走 HSEARS。仍建议拿到书面确认（邮件）。问卷首页保留自愿、匿名、可退出的说明。
  如果以后真的要在实地改变教室温度，属于干预研究，需要重新确认伦理。
- **样本**：导师曾认为 20 人太少、建议 40–60 人；用户 10/18 决定第一批按约 25 人设计、问卷编号开到 **P01–P30**
  （留余量：当天来的人多也够用），理由是 25 人 × 每节课 3 票的总票数足够。是否和导师确认、第二批是否再招人待定。分两批：
  - 第一批：用户每周一在选定教室上的课，本学期剩 **7 次**（约 10 月底至 11 月底），**每节课投 3 次**
    （开课约 15 分钟后、中段、下课前约 15 分钟，两次至少隔 30 分钟），每人预计约 15 票。
  - 第二批：第二学期（2027 年 1–3 月）的新班级，可招 2–3 个班。
  - 两批合并建模，加"批次/季节"变量。不需要同一批人跨学期。
  - 每人至少 15 票，目标 20 票。用户还没告诉我们那门周一的课有多长、班上多少人。
- **问卷题目**：删掉性别、年龄、籍贯、来港年数（Model C 的个人参数已吸收这些固定特征，也减少个人数据）。
  只保留一次性的 `self_sens`（"和大多数人比我通常偏冷/偏热"，1–5），用来和 Model C 估计的个人偏移对照。
  每次投票 7 题：座位区、热感觉（7 点）、热偏好、可接受度、衣物（20 项多选）、过去 15 分钟活动、其他感受（可选）。
  编号 P01–P30（随机抽卡，研究员不记录谁抽了哪张）。
- **数据质量规则**（收数据前写进方法章节，分析时做敏感性分析：删除标记 vs 保留全部）：
  - `duration_s` < 10 秒 → 标记；
  - 不在投票时段内提交 → 删除；
  - 同一编号同一时段多次提交 → 保留第一条；
  - 逻辑矛盾：投"热/暖"却想"暖一点"，或投"冷/凉"却想"凉一点" → 标记；
  - 衣物没有任何上装或下装 → 标记；
  - 某人 ≥ 10 票全是同一档、而室温变化 > 2°C → 标记该人；
  - 同一 `device_id` 出现多个编号 → 检查。
- **合成数据**：只用于参数恢复/样本量研究（N = 20/25/40，每人 10/15/20 票）和 EnergyPlus 里的虚拟班级
  （从拟合好的 Model C 后验生成），**不能代替真实数据得出结论**。
- **测量**：用户现有传感器只有空气温度、相对湿度、CO₂（显示 "last updated"）。还需要：
  - 黑球温度计（算平均辐射温度，ISO 7726 公式；玻璃幕墙教室尤其重要）；
  - 热线/热球风速仪（每节课每个测点测一次即可；叶轮式测不了低风速）；
  - 确认传感器能导出 1–5 分钟间隔的历史数据；放在约 0.6 m 高、避免阳光直射。
  用户还没告诉我们传感器型号。
- **教室**：推荐带玻璃幕墙的小教室（约 30 人）：温度变化大、和研究规模匹配、单区模型合理；
  备选是一面玻璃墙的中型教室；不推荐地下大教室（温度太稳定）。待做实地勘察（尺寸、窗朝向、
  空调类型、温控方式）。`docs/index.html` 里的座位平面图（3×3，窗 A 列、门 C 列）是占位版，勘察后要改。
- **AI 扩展**：核心不变（模型比较 → break-even → 三个控制器）。AI 控制作为可选的加分项（Controller 4，
  强化学习或 MPC，奖励里的舒适项来自 Model C）。用户的学长在做强化学习项目，用户自己的定位是
  "从反馈中学习的个性化自动控制（human-in-the-loop）"。真实教室闭环控制取决于能否接入空调
  （BMS 写权限 / 联网温控器 / 智能红外遥控），要先问设施管理部门；安全限制：23–26°C、每 30 分钟最多调 1°C、
  断线恢复原设定、老师可手动接管。
- **要补进 proposal 文献综述的已发表研究**（说明本项目的区别：统计上正确的分层序数模型、
  序数 vs 线性对节能结果的影响、教室场景）：
  - Lam, Yuan & Wang 2014, e-Energy（PolyU）：每人舒适档案 + 多人设定点优化，实地节能约 18%，和 Controller 3 很接近，必须引用；
  - Aryal & Becerik-Gerber 2018, Energy and Buildings：朴素贝叶斯个人模型调设定点；
  - Jazizadeh et al. 2014, Energy and Buildings；
  - Tekler et al.（arXiv 2309.09073）：58 人、XGBoost + 主动学习、EnergyPlus，和 break-even 问题重叠；
  - Feng et al. 2022, Renewable and Sustainable Energy Reviews 161:112357（25 项研究的综述）；
  - Wang & Hong 2020, Applied Energy（强化学习用于建筑控制综述）。

## 4. 待办（按优先级）

**P0 本周（目标：下周一开始第一批采集）**
- [x] 修好 Apps Script 部署并端到端测试（10/18 完成，见第 2 节）。
- [ ] 用户：删测试行、核对表格时区、撤销 clasp 授权（见第 2 节"待用户自己做"）。
- [ ] 问用户：周一那门课多长、多少人、哪间教室；拿到教室布局后改 `docs/index.html` 里的座位图（ZONES 和窗/门位置）。
- [ ] 准备：打印 P01–P30 编号卡、课件里放二维码、一段 1 分钟的研究介绍。
- [ ] 帮用户起草给导师的邮件：确认免伦理（书面）、两批采集方案、每节课 3 票、第一批 25 人。
- [ ] 传感器：确认型号、导出方式、记录间隔；问实验室借黑球温度计和热线风速仪。

**P1 接下来两周**
- [ ] 更新 proposal（`proposal/content.js` → `node proposal/build.js`）：伦理表述、两批采集与人数、
      每节课 3 票、数据质量规则、测量仪器、新增文献（第 3 节）、AI 作为扩展目标、时间表。
- [ ] `R/03_import_votes.R`：读 Google 表格导出的 CSV → 编码（tsv 有序因子、tsv_num = tsv − 4、clo 等）
      → 按第 3 节规则加质量标记 → 按时间和座位列（A→S1 窗、B→S2 中、C→S3 门）匹配传感器读数。
- [ ] `R/04_parameter_recovery.R`：模拟 N = 20/25/40、每人 10/15/20 票，检验 Model B/C 参数能否被恢复、
      break-even 曲线的精度。

**P2 之后**
- [ ] 实地勘察后搭 EnergyPlus 单区教室模型 + Controller 1（Python API）。
- [ ] 第二批采集的招募安排（第二学期课表）。

## 5. 文件地图

```
docs/index.html            问卷网页（GitHub Pages 发布目录），CONFIG 在 <script> 顶部
survey/apps_script.gs      Google Apps Script 后台
survey/README.md           后台部署说明（含 clasp 更新步骤）+ 表格列说明
survey/.clasp.json 等       clasp 配置：scriptId、网页应用 manifest、只推送 apps_script.gs
survey/vote_qr.png         问卷二维码（指向问卷网址；网址不变就不用重新生成）
survey/msforms_backup/     Microsoft Forms 导入文件（备份，已不用）
proposal/                  修订版 proposal（docx/pdf）和生成脚本（content.js 是正文，build.js 生成 Word）
R/                         00 冒烟测试、01 抽取 Favero 子集、02 复现 Favero
output/                    复现对比表、sessionInfo
data/processed/            Favero 子集（公开数据）
```

## 6. 必须遵守

- **仓库是公开的**：参与者数据（Google 表格导出、实地数据）永远不要提交。`.gitignore` 已排除
  `data/field/`、`survey/exports/`、`*.xlsx`。
- GitHub Pages 当前从 `survey-site` 分支的 `/docs` 发布；如果合并到 `main`，要同时在 Settings → Pages 改分支。
- 用户在 claude.ai 上还有两份文档（问卷设计说明、文献阅读指南），内容里"每节课 2 票、Microsoft Forms、HSEARS"
  等已被本文件第 3 节取代。
