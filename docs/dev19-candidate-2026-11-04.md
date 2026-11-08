# dev.19 本地候选包交付

2026-11-04。已在独立干净暂存目录构建 `dsh-plugin-companion/0.1.0-dev.19`，纳入主控已通过本地隔离验收的最小 ZIP 皮肤库与此前的版本提示修复，等待主控审核归档。日用 DSH 仍为 dev.18，本节点未安装或重启。

- 候选包：[dsh-plugin-companion-0.1.0-dev.19.tgz](../dist/dsh-plugin-companion-0.1.0-dev.19.tgz)，130,136,517 字节。
- SHA-256：`d645d0b0e0d807b193004199e37ac11ca0501070bb734d1543565a07ea90d673`。
- 暂存：`.local/dev19-candidate-80tc_gs4`；从源码白名单复制82份生产输入，仅在暂存修改三处包版本和随包 README 的候选版本/已验收更新步骤。没有复制隔离运行目录。
- 内置仅 `archive-warm-whale/0.7.1`，contentKey `4b643de142bb2770340cd56d7c2acd5bced3b09a69ddbf27cd3025d29639620b`；5份资源摘要及资源准备通过。

构建沿用 `npm run package:mac`。外层50份文件与干净暂存逐份匹配，内层原生应用50份业务文件一致；插件、原生和运行清单均为 dev.19，App build 为19，内层ZIP摘要、CRC及本地开发签名严格核验通过。客户端重建结果与已验收冻结稿一致。ZIP解析依赖仍明确声明 `fflate 0.8.2`。

原生 `main.mjs` 与生产源码一致，保留正常 `dsh://open` 处理代码。外层与原生业务目录均排除核心 examples/tests/scripts、A/B合成皮肤、隔离夹具、profile、验证材料及连接凭据；服务配置与生产源码逐字节一致。既有 ditto 流程保留的640份 AppleDouble 元数据已识别并检查，未含本机用户路径或协议夹具。

源码三处元数据仍为 dev.11，15份冻结源码未变，dev.18 归档摘要仍为 `ccc1483963f3ea75dc9efa9c6ce1954fcdf846b0b478e6a2134fc7fe73f649a8`。未调用真实模型或云端、未提交或推送。日用角色最新84%仅引用主控观察，本节点没有读取或写入日用配置，也未回灌旧快照。

证据与复核入口：[汇总](../reports/dev19-candidate-2026-11-04/summary.json)、[归档核对](../reports/dev19-candidate-2026-11-04/archive-audit.json)、[归档文件清单](../reports/dev19-candidate-2026-11-04/archive-files.json)。在源码根目录运行 `python3 reports/dev19-candidate-2026-11-04/audit.py` 可只读复核；保留暂存内运行 `npm run package:mac` 可重新构建，签名/ZIP时间戳可能使重建摘要不同，以本次候选摘要为审核对象。

下一道门是主控对上述具体归档的审核；本地功能验收、归档审核和后续安装验收分别记录。沉浸视觉小样未纳入本包。

## 主控归档复核

2026-11-04，上述具体 SHA-256 候选通过**本地开发包归档审核**。主控直接只读核对交付包与暂存包摘要、50份外层文件、50份原生业务文件、内层ZIP CRC、三处dev.19版本/构建19、准确0.7.1及5份资源、15份冻结源码、版本提示修复与正常dsh协议；旧dev.18归档未变。独立回执见 `reports/dev19-candidate-2026-11-04/primary-review.json`。

既有流程的 `codesign --verify --strict` 独立复核通过；主控额外执行 `--deep --strict` 时，嵌套Electron Helper签名检查未通过，同一检查在dev.18暂存也出现相同错误。此项记录为正式分发签名待办，本次仅通过本地ad-hoc开发候选包审核，不声称已通过嵌套签名或正式分发审核。日用未安装/重启，新皮肤库的共同用户验收仍待后续安排。
