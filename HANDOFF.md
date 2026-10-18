# 交接文档 HANDOFF（2026-10-18）

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
| 问卷后台（Google Apps Script → Google 表格） | **未通，见下方"当前问题"** | `survey/apps_script.gs`、`survey/README.md` |
| 二维码 | 完成，指向问卷网址 | `survey/vote_qr.png` |
| Microsoft Forms 备用方案 | 导入用 Word 文件（已不用，留作备份） | `survey/msforms_backup/` |

- 问卷网址：<https://auz223243-hub.github.io/final-year-project/>（加 `?preview` 为测试模式，不发送数据）
- Apps Script 网页应用部署 ID：`AKfycbyjZ_6y88BAOvnpLxH1QasDTIQf2sZeYAoN4GDbrCcb2e3atyM9NVYW1wYa_WHkG3mF`
  - `/exec` 网址：`https://script.google.com/macros/s/AKfycbyjZ_6y88BAOvnpLxH1QasDTIQf2sZeYAoN4GDbrCcb2e3atyM9NVYW1wYa_WHkG3mF/exec`（已写进 `docs/index.html` 的 `CONFIG.ENDPOINT`）
- Apps Script 项目 ID（scriptId，从用户给的库链接得到）：`1R1MZJLTFoITGdBC9KyllHrjoZpX37rndtAuYM1Yl9IKt-vVeTzoEWKmM`
- Google 账号：auz223243@gmail.com

### 当前问题（P0，最先处理）

1. 用户的 Apps Script 项目是在 script.google.com 直接新建的（不是从表格打开的），旧代码里
   `SpreadsheetApp.getActiveSpreadsheet()` 返回 null，`/exec` 报错
   `TypeError: Cannot read properties of null (reading 'getSheetByName') (line 49)`。
2. 仓库里的新版 `survey/apps_script.gs` 已修复（没有绑定表格时会自动新建 "Classroom Comfort Votes"
   表格并把 ID 存进 Script Properties，另有 `setup()` 函数）。
3. 但用户把新版本部署成了**库（Library）**，网页应用（Web app）部署仍在跑旧版本；用户运行 `setup()`
   后日志也没有显示表格链接（原因未确认：可能没粘贴新代码、选错了函数，或授权没走完）。

**建议用 clasp 在用户电脑上直接修复，保持原网址。** 云端会话做不了这一步：`script.google.com`
被网络策略拦截，而且 `clasp login` 需要用户在自己浏览器里授权。`survey/` 里已经放好
`.clasp.json`（scriptId）、`appsscript.json`（网页应用设置）和 `.claspignore`（只推送
`apps_script.gs` 和 manifest，已用 `clasp status` 验证），用户不需要改任何文件。
完整步骤见 `survey/README.md` 的 "Updating the live backend with clasp"，要点：

```bash
cd survey                                   # survey-site 分支
npx @google/clasp@2.4.2 login               # 固定 2.4.2：clasp 3 改了 deploy 命令
npx @google/clasp@2.4.2 push                # 问是否覆盖 manifest 时选 y
npx @google/clasp@2.4.2 open                # 在编辑器里选 setup → 运行 → 授权，日志显示表格链接
npx @google/clasp@2.4.2 deploy -i AKfycbyjZ_6y88BAOvnpLxH1QasDTIQf2sZeYAoN4GDbrCcb2e3atyM9NVYW1wYa_WHkG3mF -d "fix standalone sheet"
```

`clasp deploy -i <部署ID>` 会更新已有的网页应用部署，网址不变，`docs/index.html` 不用改。

**验收：**
1. 浏览器打开 `/exec`，返回 `{"ok":true,"votes":0}`。
2. 手机扫码投一票，Google Drive 里的 "Classroom Comfort Votes" 表格的 `votes` 工作表多出一行，
   列为：`server_time, sid, client_time, participant, seat_zone, tsv, tpv, accept, garments, clo,
   clo_tbc, activity, sun, draught, stuffy, self_sens, duration_s, device_id, version`。
3. 测试完删掉测试行。

注意：页面用 `fetch(..., {mode: "no-cors"})` 发送，读不到服务器回复；断网时投票会存在手机
`localStorage`（`ccv_queue`），下次打开页面自动补发；每票带唯一 `sid`，服务器用 CacheService
去重（6 小时内）。`KEY = fyp-ccv-2026` 在页面和脚本里必须一致。

## 3. 已和用户/导师确定的决定（覆盖 proposal 和旧问卷文档里不一致的地方）

- **伦理**：导师说只做匿名问卷不用走 HSEARS。仍建议拿到书面确认（邮件）。问卷首页保留自愿、匿名、可退出的说明。
  如果以后真的要在实地改变教室温度，属于干预研究，需要重新确认伦理。
- **样本**：导师认为 20 人太少 → 目标 40–60 人，分两批：
  - 第一批：用户每周一在选定教室上的课，本学期剩 **7 次**（约 10 月底至 11 月底），**每节课投 3 次**
    （开课约 15 分钟后、中段、下课前约 15 分钟，两次至少隔 30 分钟），每人预计约 15 票。
  - 第二批：第二学期（2027 年 1–3 月）的新班级，可招 2–3 个班。
  - 两批合并建模，加"批次/季节"变量。不需要同一批人跨学期。
  - 每人至少 15 票，目标 20 票。用户还没告诉我们那门周一的课有多长、班上多少人。
- **问卷题目**：删掉性别、年龄、籍贯、来港年数（Model C 的个人参数已吸收这些固定特征，也减少个人数据）。
  只保留一次性的 `self_sens`（"和大多数人比我通常偏冷/偏热"，1–5），用来和 Model C 估计的个人偏移对照。
  每次投票 7 题：座位区、热感觉（7 点）、热偏好、可接受度、衣物（20 项多选）、过去 15 分钟活动、其他感受（可选）。
  编号 P01–P60（随机抽卡，研究员不记录谁抽了哪张）。
- **数据质量规则**（收数据前写进方法章节，分析时做敏感性分析：删除标记 vs 保留全部）：
  - `duration_s` < 10 秒 → 标记；
  - 不在投票时段内提交 → 删除；
  - 同一编号同一时段多次提交 → 保留第一条；
  - 逻辑矛盾：投"热/暖"却想"暖一点"，或投"冷/凉"却想"凉一点" → 标记；
  - 衣物没有任何上装或下装 → 标记；
  - 某人 ≥ 10 票全是同一档、而室温变化 > 2°C → 标记该人；
  - 同一 `device_id` 出现多个编号 → 检查。
- **合成数据**：只用于参数恢复/样本量研究（N = 20/40/60，每人 10/15/20 票）和 EnergyPlus 里的虚拟班级
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
- [ ] 修好 Apps Script 部署并端到端测试（见第 2 节）。
- [ ] 问用户：周一那门课多长、多少人、哪间教室；拿到教室布局后改 `docs/index.html` 里的座位图（ZONES 和窗/门位置）。
- [ ] 准备：打印 P01–P60 编号卡、课件里放二维码、一段 1 分钟的研究介绍。
- [ ] 帮用户起草给导师的邮件：确认免伦理（书面）、两批采集方案、每节课 3 票、40–60 人目标。
- [ ] 传感器：确认型号、导出方式、记录间隔；问实验室借黑球温度计和热线风速仪。

**P1 接下来两周**
- [ ] 更新 proposal（`proposal/content.js` → `node proposal/build.js`）：伦理表述、两批采集与人数、
      每节课 3 票、数据质量规则、测量仪器、新增文献（第 3 节）、AI 作为扩展目标、时间表。
- [ ] `R/03_import_votes.R`：读 Google 表格导出的 CSV → 编码（tsv 有序因子、tsv_num = tsv − 4、clo 等）
      → 按第 3 节规则加质量标记 → 按时间和座位列（A→S1 窗、B→S2 中、C→S3 门）匹配传感器读数。
- [ ] `R/04_parameter_recovery.R`：模拟 N = 20/40/60、每人 10/15/20 票，检验 Model B/C 参数能否被恢复、
      break-even 曲线的精度。

**P2 之后**
- [ ] 实地勘察后搭 EnergyPlus 单区教室模型 + Controller 1（Python API）。
- [ ] 第二批采集的招募安排（第二学期课表）。

## 5. 文件地图

```
docs/index.html            问卷网页（GitHub Pages 发布目录），CONFIG 在 <script> 顶部
survey/apps_script.gs      Google Apps Script 后台
survey/README.md           后台部署说明 + 表格列说明
survey/vote_qr.png         问卷二维码
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
