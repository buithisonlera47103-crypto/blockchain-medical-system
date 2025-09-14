# 前端 UI 设计规范（Design Specification）

本规范旨在指导前端开发团队完善和实现区块链 EMR 系统剩余的 UI 组件与交互流程。本文档覆盖缺失组件清单、详细组件说明（等同于线框/原型描述）、用户体验流程、响应式与可访问性要求、与现有组件的集成点以及整体 UX 改进建议。按本文档实施后，前端开发可在无需额外澄清的情况下完成实现。

—

## 0. 现状与范围
- 已完成（参考代码现状）
  - 患者病历列表/详情/下载（含后端下载与 IPFS 下载）；IPFS 下载具备进度展示与本地解密选项。
  - ABAC 基于策略的访问控制已在后端实现，前端具备“申请权限”入口（需扩展为完整工作流）。
  - 审计日志写入区块链与数据库（后端），前端缺少可视化。
  - HSM（PKCS#11）集成（后端）并可配置；前端缺少状态与故障自诊断可视化。
- 本设计规范重点：
  - 补齐“权限申请工作流、策略管理、审计可视化、DICOM/PDF 预览、上传向导、IPFS 网络状态、系统设置”等前端页面/组件。
  - 不新增后端 API（若有接口需求，下文明确列出既有接口或建议补充接口）。

—

## 1. 缺失 UI 组件与页面清单
1) 访问权限申请与审批（Access Request）
- AccessRequestModal（发起申请）
- AccessRequestListPage（我发起/我审批的申请列表）
- AccessRequestDetailDrawer（审批/撤回/附言）

2) 策略与角色管理（Admin）
- PolicyListPage（分页、筛选、启停）
- PolicyEditorDrawer（创建/编辑策略；条件构建器）
- RoleUserMappingPage（用户-角色映射维护）

3) 审计与链上状态
- AuditLogListPage（过滤、分页、导出）
- AuditLogDetailDrawer（链上校验、详情）
- BlockchainStatusCard（通道/链码/延迟 等只读状态卡片）

4) 病历上传与预览增强
- MedicalRecordUploadWizard（多步：基础信息→文件→加密→上传→确认）
- DICOMViewerPanel（第三方查看器占位整合策略）
- PDFViewerPanel（统一预览容器）

5) IPFS 与存储状态
- IPFSNetworkStatusBadge（连通性/延迟/网关切换）
- StorageTierIndicator（本地缓存/冷存储状态）

6) 通知与任务
- NotificationCenterDrawer（系统事件/审批结果等）
- BackgroundTasksPanel（上传/下载队列）

7) 系统设置与诊断
- SettingsPage（HSM/链码切换/网关配置）
- HSMHealthCard（PKCS#11 探活与状态反馈）

—

## 2. 组件与页面规格（线框/原型文字版）

### 2.1 AccessRequestModal（权限申请弹窗）
- 触发：病历详情页无权限状态下点击“申请权限”。
- 字段：
  - 申请操作（只读，默认 read；未来支持 write/share）
  - 申请原因（TextArea，必填，≤ 500 字）
  - 有效期（DateRange，可选）
  - 附件/证明（可选 File，最大 5MB）
- 行为：提交后提示“已提交，等待审批”，关闭弹窗。
- API：POST /api/v1/permissions/requests
- 验证：必填项校验，文件大小/类型校验。

### 2.2 AccessRequestListPage（申请列表）
- 视图切换：
  - 我发起（可撤回）
  - 待我审批（审批人角色可见）
- 列：申请人/记录ID/操作/状态/创建时间/有效期/操作（查看/撤回/审批）
- 过滤：状态、时间范围、操作类型、科室/患者（可选）
- 分页：服务器分页
- API：
  - GET /api/v1/permissions/requests?role=owner|approver
  - POST /api/v1/permissions/requests/:id/withdraw

### 2.3 AccessRequestDetailDrawer（详情/审批）
- 展示：基础信息、申请原因、历史流转、附件下载。
- 操作（审批人）：同意/拒绝（必填批注）
- API：
  - GET /api/v1/permissions/requests/:id
  - POST /api/v1/permissions/requests/:id/approve|reject

### 2.4 PolicyListPage（策略列表）
- 列：名称/主体/动作/资源/条件/效果/优先级/状态/更新时间
- 操作：创建、编辑、启停、删除、导出JSON
- 过滤：主体类型、动作、资源类型、状态
- API（已实现的策略路由）：
  - GET/POST/PUT/DELETE /api/v1/policies
  - POST /api/v1/policies/reload

### 2.5 PolicyEditorDrawer（策略编辑）
- 表单分区：
  - 基础信息（名称、描述、优先级、是否激活）
  - 主体（user/role/group + id; 可选“动态属性”：roles[]）
  - 动作（read/write/delete/share/admin）
  - 资源（resourceType: medical_record；resourceId: * 或具体ID）
  - 条件构建器（时间/IP/科室 等；JSON 预览）
  - 效果（allow/deny）
- 验证：优先级数值、JSON 条件语法
- API：参考策略路由

### 2.6 RoleUserMappingPage（角色映射）
- 列：用户ID/姓名/当前角色/操作（编辑）
- 编辑：弹窗批量切换/添加角色
- API（建议）：
  - GET /api/v1/admin/users?withRoles=1
  - PUT /api/v1/admin/users/:id/roles

### 2.7 AuditLogListPage（审计列表）
- 列：时间/用户/动作/资源/链上Tx/操作
- 过滤：用户、动作、时间范围、是否上链
- 操作：导出CSV、查看详情
- API：GET /api/v1/audit?userId=&action=&limit=

### 2.8 AuditLogDetailDrawer（详情）
- 展示：所有字段、链上校验按钮（调用 GetAuditLog），校验结果状态
- API：
  - GET /api/v1/audit/:id
  - GET /api/v1/audit/:id/verify

### 2.9 BlockchainStatusCard（链上状态）
- 字段：通道、链码名、节点可达性、最近延迟（读/写均值）
- 小窗卡片，放置于仪表盘与设置页
- API（建议）：GET /api/v1/system/blockchain/status

### 2.10 MedicalRecordUploadWizard（上传向导）
- Step1 基础信息：标题、类型、科室、描述
- Step2 文件：拖拽上传（多文件可选，单记录一主文件），校验类型与大小
- Step3 加密：
  - 是否客户端加密（默认开）
  - 算法（AES-256-GCM，固定）
  - 密钥来源：自动生成/粘贴（Base64）
- Step4 上传：分片展示进度，失败重试，完成后展示 CID 与区块链记录号
- Step5 确认与分享：复制信息，跳转到详情
- API：沿用现有上传与后端记录写入接口

### 2.11 DICOMViewerPanel / PDFViewerPanel
- PDF：基于 <embed> 或 PDF.js（推荐），支持缩放、分页
- DICOM：采用占位策略：
  - 初期：提示“请下载使用专业工具查看”，提供查看器推荐链接
  - 目标：按需集成开源 DICOM 查看器（如 Cornerstone）

### 2.12 IPFSNetworkStatusBadge
- 显示：在线/离线、网关 RTT、当前使用网关
- 交互：网关切换（下拉）
- API：使用现有 ipfsService.status() 拓展（如需）

### 2.13 StorageTierIndicator
- 显示：本地缓存命中率、冷存储（IPFS）可用性
- 放置：病历详情页信息区/上传完成页

### 2.14 NotificationCenterDrawer
- 列：时间/来源/内容/状态（已读）
- 触发：右上角铃铛图标
- 数据来源：
  - 审批结果推送（后端事件→WebSocket/轮询）
  - 上传/下载完成

### 2.15 BackgroundTasksPanel
- 队列：上传/下载项，支持取消/重试
- 与 UploadWizard 与 IPFS 下载打通

### 2.16 SettingsPage + HSMHealthCard
- 设置项：
  - IPFS 网关列表与默认
  - 审计链码选择（audit_cc / medical_record）
  - HSM：只读（provider、module path、slot），“探活”按钮
- HSMHealthCard：调用 /api/v1/system/hsm/health（后端提供）

—

## 3. 用户体验流程（高层次）

### 3.1 病历上传（加密 → IPFS → 区块链）
1) 进入 UploadWizard，填写基础信息
2) 选择文件并预校验
3) 选择是否客户端加密（默认开），若粘贴密钥进行 Base64 校验
4) 执行上传：展示每步进度（分片、Pin、回写元数据）
5) 成功后展示 CID、链上 Tx、内容哈希，可一键复制与分享

### 3.2 病历下载（IPFS 本地解密）
1) 点击“通过 IPFS 下载”
2) 若为加密文件，弹出解密弹窗（默认勾选“本地解密”）
3) 粘贴 Base64 密钥或导入 .key 文本文件
4) 下载并展示实时进度（已下载字节/百分比），完成后保存文件

### 3.3 权限申请与审批
1) 无权限用户点击“申请权限”→ AccessRequestModal
2) 审批人从待办进入 AccessRequestListPage → Detail → 同意/拒绝
3) 通知中心与邮件（可选）告知结果

### 3.4 策略管理
1) 管理员在 PolicyListPage 检索策略
2) 打开 PolicyEditorDrawer 编辑主体/动作/资源/条件/效果，实时 JSON 预览
3) 保存并“重新加载策略”

### 3.5 审计查看与校验
1) 在 AuditLogListPage 过滤定位
2) 打开详情抽屉，触发链上校验，展示校验结果

—

## 4. 响应式设计要求
- 断点（基于 Ant Design 默认栅格）：
  - xs < 576：单列布局，抽屉/弹窗全屏；表格滚动
  - sm ≥ 576, md ≥ 768, lg ≥ 992, xl ≥ 1200, xxl ≥ 1600：多列信息分栏
- 列表页：列最少宽度与横向滚动；操作按钮收纳至 Dropdown 于小屏
- 预览：PDF/DICOM 容器自适应（max-height: 70vh）
- 上传向导：分步面板在小屏改为纵向堆叠

—

## 5. 无障碍（Accessibility）
- 键盘导航：所有交互元素可 Tab 到达；提供明显 Focus 样式
- 语义化：表格、表单、标题使用语义标签；ARIA 属性用于弹窗、抽屉
- 对比度：遵循 WCAG AA（文本对比度 ≥ 4.5:1）
- 表单错误：联动 aria-invalid、aria-describedby，错误信息文本化
- 非文本内容：图标/按钮提供 aria-label；预览区提供替代说明
- 动画与动效：避免强闪烁；进度变化平滑

—

## 6. 与现有代码的集成点
- 状态/上下文：useAuth（用户身份、角色）
- 服务：
  - ipfsService（uploadFile/downloadFile/status/pin/unpin）
  - apiRequest（统一 API 封装）
- 已有组件：MedicalRecordViewer（集成 IPFS 下载弹窗的增强版）、病历列表页
- 后端 API（已存在或建议）：
  - 策略：/api/v1/policies（已实现）
  - 审计：/api/v1/audit 与 /verify（部分已存在，建议补足）
  - 权限申请流：/api/v1/permissions/requests（建议补足）
  - 系统探活：/api/v1/system/blockchain/status、/api/v1/system/hsm/health（建议补足）

—

## 7. 设计规范与可复用模式
- 视觉：延续 Ant Design 主题；主色（医疗蓝 #1890ff），成功/警告/错误用色遵循 AntD
- 组件模式：
  - Drawer + Form（编辑/详情）；Modal（确认/简短输入）
  - Result/Empty/Skeleton（加载与空态）；Notification/Message（反馈）
- 表单校验：统一以 Form rules + 自定义校验函数；密钥 Base64 校验复用
- 错误处理：apiRequest 拦截统一弹出错误（Message.error）并上报
- 国际化（建议）：采用 react-intl 或 i18next；当前包含中英混用，建议补齐文案资源

—

## 8. 性能与安全（前端侧）
- 按需加载：DICOM/PDF 查看器组件包使用动态 import，避免初始包膨胀
- 大文件处理：上传/下载采用流式；进度节流更新
- 敏感数据：密钥仅驻留内存，不落地；下载完成后立即清理引用
- XSS/注入：富文本/JSON 预览进行转义；仅白名单类型可渲染

—

## 9. 开发拆解与验收标准
- 里程碑 M1：AccessRequest 流程（发起/审批/列表）
  - 验收：发起/撤回/审批全链路打通；权限变更生效可在详情页体现
- 里程碑 M2：策略管理页面（列表+编辑+重载）
  - 验收：策略创建/编辑/停用可用；条件 JSON 正确落库与生效
- 里程碑 M3：审计列表与详情（含链上校验）
  - 验收：过滤分页正常；至少一条日志可校验成功
- 里程碑 M4：上传向导与预览增强
  - 验收：5 步流程稳定；PDF 可内嵌预览；DICOM 提示/占位
- 里程碑 M5：系统状态与设置
  - 验收：IPFS/HSM/链码状态可见；设置项保存并即时生效（如适用）

—

## 10. 交互细节与文案（示例）
- 权限申请：
  - 成功：“权限申请已提交，通常在 24 小时内完成审批。”
  - 拒绝需填写理由；撤回需二次确认
- 策略保存：
  - 成功：“策略已保存，是否立即重载生效？”（二次确认）
- 审计校验：
  - 成功：“链上校验通过（Tx: XXXXXXXX）”；失败展示错误原因

—

## 11. 风险与替代方案
- DICOM 查看器体积大且依赖复杂：先占位，后集成（动态加载 + 独立包）
- 审批与策略后端接口若未就绪：前端先实现数据 Mock 与接口适配层，接口落定后切换

—

## 12. 附：建议/需要的后端接口补充
- 权限申请流（requests CRUD、审批操作）
- 系统探活：区块链状态、HSM 健康检查
- 审计详情与校验（若未覆盖）

—

## 13. 实施清单（任务分解）
- 组件：AccessRequestModal / ListPage / DetailDrawer
- 页面：PolicyListPage / PolicyEditorDrawer / RoleUserMappingPage
- 页面：AuditLogListPage / AuditLogDetailDrawer / BlockchainStatusCard
- 流程：MedicalRecordUploadWizard / PDFViewerPanel / DICOMViewerPanel
- 工具：IPFSNetworkStatusBadge / StorageTierIndicator / NotificationCenterDrawer / BackgroundTasksPanel
- 设置：SettingsPage + HSMHealthCard

以上设计规范为最终交付版本，可直接据此进行前端实现与验收。

