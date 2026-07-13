# **1. Introduction**

Resource Management and Access Control System (RMACS) is a full-stack enterprise management platform with a Spring Boot backend and a React frontend. The system is designed to centrally manage users, project membership, infrastructure resources, endpoint permissions, access requests, and audit logs, while also providing integrated emulators for HTTP traffic testing, socket-based terminal communication, and AWS operations through LocalStack.

The first draft defined a conceptual OOP direction. The current implementation now includes persisted domain models, role-driven authorization behavior, API-level and resource-level permission controls, project manager lifecycle tracking, and simulator endpoints that execute real backend operations instead of placeholder logic.

The platform focuses on three major needs:

1. Controlled access in multi-role environments (Super Admin, Project Manager, Employee).  
2. Traceable infrastructure and membership changes through audit records and history snapshots.  
3. Safe testing of network and cloud workflows through emulator modules.

## **1.1 Objectives**

* Implement role-based access with request-approval workflow and explicit denied/pending states.
* Build project and project-member management with role restrictions and lifecycle states.
* Build resource governance with service-level details, credential storage, and delegated access control.
* Provide API endpoint-level permissions for fine-grained access beyond project boundaries.
* Implement backend emulators for HTTP, socket communication, and AWS (S3 and DynamoDB via LocalStack).
* Maintain complete auditable state transitions for governance actions.
* Apply object-oriented design through model encapsulation, service-layer abstraction, and controller-service separation.

## **1.2 Scope**

The implemented system currently covers:

* Authentication and Access Requests: request-access, login, and user profile lookup.
* User Administration: role updates, user removal, user search/filter.
* Access Request Review: pending queue and approve/deny pipeline.
* Project Management: create/list/update projects, add/remove members.
* Resource Management: create resource, add network services, grant/revoke permissions.
* API Endpoint Governance: create endpoints, grant endpoint access.
* Credential Management: super-admin-only credential upsert and view.
* Audit and PM History: read activity trails and PM lifecycle buckets.
* Emulators:
  * HTTP single request and collection run/import.
  * Socket command bridge.
  * AWS LocalStack action dispatch for LOCALSTACK, S3, DYNAMODB.

## **1.3 Technology Stack**

| Component | Technology | Purpose |
| ----- | ----- | ----- |
| Frontend UI | React + Vite | Operator interface and role-based views |
| Backend API | Spring Boot 3.4.x (Java) | REST APIs, validation, orchestration |
| Language Level | Java toolchain 23 (main module) | Object-oriented domain + service logic |
| Database | MySQL | Persistent storage of users, projects, resources, permissions, logs |
| ORM/Data Layer | Spring Data JPA | Entity mapping and repository abstraction |
| Security Utility | BCryptPasswordEncoder | Password and secret hashing |
| HTTP Emulator Core | java.net.http.HttpClient | Request execution and collection runner |
| SSH/Socket Emulator Core | java.net.Socket | Raw TCP command transport |
| AWS Emulator Core | AWS SDK v2 + LocalStack | S3/DynamoDB operations in local cloud sandbox |
| Build Tools | Gradle (main app), Maven (java-sdk-v2 sample) | Build and execution workflows |

# **2. Literature Survey**

A review of enterprise access-governance and emulator patterns was used to refine the implemented architecture.

## **2.1 Existing Systems and Research**

**2.1.1 Enterprise RBAC Systems**

Conventional RBAC systems provide role assignment but often stop at static role-to-feature mapping. RMACS extends this with a reviewable request pipeline (`PENDING` and `DENIED`) and runtime role transitions with audit records.

**2.1.2 DevOps Access Platforms**

Many internal platforms separate infrastructure inventory from endpoint permissioning. RMACS models both layers: resource-level permissions and API endpoint-level permissions, allowing finer control for cross-project API access.

**2.1.3 API Client and Collection Tools**

General API tools support collection runs but are disconnected from enterprise access models. RMACS integrates collection import/run directly into the backend service layer, enabling controlled usage within the same governance platform.

**2.1.4 Local Cloud Emulation Frameworks**

Live AWS testing is expensive and risky for development workflows. LocalStack-based AWS emulation enables low-cost, reproducible testing. RMACS integrates this through service-action routing and structured failure/success response envelopes.

**2.1.5 Java OOP and Layered Service Design**

The implemented backend follows layered decomposition (Controller -> Service -> Repository -> Model), a standard OOP and enterprise Java pattern that increases maintainability and testability.

## **2.2 Gap Analysis**

| Existing Approach | Limitation | RMACS Solution |
| ----- | ----- | ----- |
| Static RBAC systems | No access-request lifecycle | Pending-review-approve/deny workflow with role assignment |
| Project-only resource platforms | No endpoint-level grant model | ApiEndpoint + ApiEndpointPermission controls |
| External API tools | Detached from governance and user roles | Built-in HTTP/collection emulator under same access model |
| Ad-hoc cloud testing | Risk of hitting live cloud by mistake | LocalStack endpoint override with constrained action set |
| Untracked admin operations | Limited accountability | Centralized AuditLog with actor/target/entity/action details |

# **3. Object-Oriented Programming Concepts Applied**

The backend implementation applies OOP through entity encapsulation, domain enums, layered abstraction, and specialized service classes.

## **3.1 Encapsulation**

All domain models keep fields private with public getters/setters. Validation constraints and JPA annotations define controlled state boundaries. Examples include User, Project, Resource, and AccessRequest entities.

## **3.2 Inheritance**

The implemented codebase favors composition and layered services over deep inheritance trees. Reuse is achieved via Spring-managed service components and repository interfaces.

## **3.3 Polymorphism**

Behavior polymorphism appears through service dispatch and framework contracts:

* Emulator routing polymorphism in AwsEmulatorService where service/action combinations are dispatched to specialized handlers.
* Collection execution paths handle multiple HTTP method behaviors using unified request models.

## **3.4 Abstraction**

Abstraction is achieved via:

* Repository interfaces abstracting SQL persistence details.
* Service classes abstracting controller concerns from operational logic.
* DTOs abstracting transport payloads from internal entity models.

## **3.5 MVC Architecture**

The deployed project follows a modern web MVC separation:

* Model: JPA entities and enums in model package.
* View: React pages and components in frontend module.
* Controller: Spring REST controllers for all API boundaries.
* Service: Dedicated application logic modules.

## **3.6 Class Structure Overview**

| Package | Class/File | Responsibility |
| ----- | ----- | ----- |
| model | User.java | User identity, role, and provenance |
| model | AccessRequest.java | Access request state and review metadata |
| model | Project.java | Project lifecycle and ownership |
| model | ProjectMember.java / ProjectMemberId.java | Project membership mapping |
| model | ProjectManagerHistory.java | PM status transition snapshots |
| model | Resource.java | Core managed resource entity |
| model | ResourceService.java | Network/service endpoint metadata |
| model | ResourcePermission.java | Resource-level access + delegation |
| model | ResourceCredential.java | Service credential record |
| model | ApiEndpoint.java | API endpoint catalog per resource |
| model | ApiEndpointPermission.java | Endpoint access grants |
| model | AuditLog.java | Governance event trail |
| model | SshProfile.java | User-saved SSH profile templates |
| controller | AuthController.java | Login and access request APIs |
| controller | AccessRequestController.java | Pending request review APIs |
| controller | UserController.java | User list/role/remove APIs |
| controller | ProjectController.java | Project CRUD and membership APIs |
| controller | ResourceController.java | Resource, service, permission, endpoint, credential APIs |
| controller | EmulatorController.java | HTTP/socket/AWS emulator APIs |
| controller | SshProfileController.java | SSH profile CRUD APIs |
| service | AwsEmulatorService.java | AWS action routing and execution |
| service | CollectionImportService.java | Postman collection parsing |
| service | CollectionRunService.java | Sequential collection execution |
| service | AuditLogService.java | Centralized audit persistence |
| service | ProjectManagerHistoryService.java | PM history records |

# **4. System Design**

## **4.1 Database Schema**

The active schema is represented by persisted JPA entities and enums. The following model tables summarize the implemented structures.

| User |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| name | String |
| email | String (unique) |
| passwordHash | String |
| addedBy | User (ManyToOne) |
| role | UserRole |
| addedAt | LocalDateTime |

| AccessRequest |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| user | User (ManyToOne) |
| requestReason | String |
| status | AccessRequestStatus |
| requestedAt | LocalDateTime |
| reviewedBy | User (ManyToOne) |
| reviewedAt | LocalDateTime |
| rejectionReason | String |

| UserRole (enum) |  |
| :---- | :---- |
| **Value** | **Meaning** |
| SUPER_ADMIN | Full administrative role |
| PROJECT_MANAGER | Project lead role |
| EMPLOYEE | Standard user role |
| PENDING | Access request awaiting review |
| DENIED | Access request rejected |

| AccessRequestStatus (enum) |  |
| :---- | :---- |
| **Value** | **Meaning** |
| PENDING | Awaiting review |
| APPROVED | Request approved |
| REJECTED | Request rejected |
| REVOKED | Revoked request state |

| Project |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| name | String |
| description | String (TEXT) |
| status | ProjectStatus |
| createdBy | User (ManyToOne) |
| createdAt | LocalDateTime |
| finishedAt | LocalDateTime |
| cancelledAt | LocalDateTime |

| ProjectMemberId (Embeddable) |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| projectId | Long |
| userId | Long |
| equals()/hashCode() | Composite-key identity |

| ProjectMember |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | ProjectMemberId |
| project | Project (ManyToOne) |
| user | User (ManyToOne) |
| role | String (Manager / Member) |
| addedBy | User (ManyToOne) |
| addedAt | LocalDateTime |

| ProjectManagerHistory |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| userIdSnapshot | Long |
| userNameSnapshot | String |
| userEmailSnapshot | String |
| status | PmStatus |
| changedByUserId | Long |
| changedByName | String |
| note | String (TEXT) |
| changedAt | LocalDateTime |

| ProjectStatus (enum) |  |
| :---- | :---- |
| **Value** | **Meaning** |
| INITIATED | Project created/planned |
| IN_PROGRESS | Actively executing |
| FINISHED | Successfully completed |
| CANCELLED | Terminated before completion |

| PmStatus (enum) |  |
| :---- | :---- |
| **Value** | **Meaning** |
| ACTIVE | Currently serving as PM |
| ROLE_CHANGED | Shifted out of PM role |
| RESIGNED | PM resigned |
| REMOVED | PM removed administratively |

| Resource |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| project | Project (ManyToOne) |
| name | String |
| resourceType | String |
| status | ResourceStatus |
| createdBy | User (ManyToOne) |
| createdAt | LocalDateTime |

| ResourceService |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| resource | Resource (ManyToOne) |
| serviceProtocol | String |
| ipAddress | String |
| port | Integer |
| connectionMetadata | String (TEXT) |

| ResourcePermission |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| resource | Resource (ManyToOne) |
| user | User (ManyToOne) |
| canAccess | boolean |
| canGrantAccess | boolean |
| grantedBy | User (ManyToOne) |
| grantedAt | LocalDateTime |

| ResourceCredential |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| resourceService | ResourceService (OneToOne) |
| authMethod | AuthMethod |
| username | String |
| encryptedSecret | String (TEXT) |
| updatedAt | LocalDateTime |

| ApiEndpoint |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| resource | Resource (ManyToOne) |
| name | String |
| httpMethod | String |
| url | String |
| apiKey | String |
| projectWideAccess | boolean |

| ApiEndpointPermission |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| apiEndpoint | ApiEndpoint (ManyToOne) |
| user | User (ManyToOne) |
| canAccess | boolean |
| grantedBy | User (ManyToOne) |
| grantedAt | LocalDateTime |

| ResourceStatus (enum) |  |
| :---- | :---- |
| **Value** | **Meaning** |
| PROVISIONED | Available for use |
| MAINTENANCE | In maintenance mode |
| DECOMMISSIONED | Retired from active use |

| AuthMethod (enum) |  |
| :---- | :---- |
| **Value** | **Meaning** |
| PASSWORD | Password authentication |
| SSH_KEY | SSH key authentication |
| TOKEN | Token/API credential |

| AuditLog |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| actorUserId | Long |
| actorName | String |
| targetUserId | Long |
| targetName | String |
| actionType | String |
| entityType | String |
| entityId | String |
| details | String (TEXT) |
| createdAt | LocalDateTime |

| SshProfile |  |
| :---- | :---- |
| **Attribute/Method** | **Type** |
| id | Long |
| user | User (ManyToOne) |
| name | String (unique per user) |
| host | String |
| port | Integer |
| username | String |
| ptyType | String |
| createdAt | LocalDateTime |
| updatedAt | LocalDateTime |

## **4.2 Application Flow**

1. User sends access request via authentication module. Backend creates pending user and pending request records.
2. Super admin fetches pending requests and reviews one request at a time.
3. Approval assigns business role and reviewer metadata; rejection moves user to denied state.
4. Authenticated users access role-scoped project and resource views through userId-driven API filters.
5. Project and resource updates trigger audit entries and, where applicable, project manager history updates.
6. Resource creation auto-initializes project member permissions and grant rights for managers/admins.
7. Endpoint and credential APIs enforce role constraints (for example, credentials are super-admin-only).
8. Emulator module executes HTTP/socket/AWS actions and returns standardized payloads for frontend rendering.
9. Audit and dashboard endpoints aggregate operational state for monitoring and governance.

### **4.3 Flow Chart**

Textual flow reference:

Access Request -> Pending Queue -> Super Admin Review -> Role Activation -> Project/Resource Operations -> Audit Trail -> Emulator Operations (HTTP/SSH/AWS) -> Structured Response Output

# **5. Sample Screenshots**

The following screenshots should be inserted from the current frontend implementation.

## **Screenshot 1: Login and Request Access**

Description: Login screen with dual modes (Sign in and Request Access), including success animation and pending/denied feedback behavior.

## **Screenshot 2: Dashboard**

Description: Role-sensitive dashboard showing aggregate project/resource metrics with status segmentation.

## **Screenshot 3: Users and Pending Requests**

Description: Super-admin view of pending access requests with Grant and Deny actions, plus user role sections.

## **Screenshot 4: Projects and Project Detail**

Description: Project list and detail view including members, status transitions, and member add/remove actions.

## **Screenshot 5: Resources and Resource Detail**

Description: Resource list and detail including service definitions, permission matrix, endpoint list, and credential visibility controls.

## **Screenshot 6: HTTP Emulator**

Description: Single-request builder and response pane with status/body/headers display, plus collection import/run flow.

## **Screenshot 7: SSH Emulator and Profiles**

Description: Socket payload execution interface and persisted SSH profile management.

## **Screenshot 8: AWS Emulator**

Description: Action builder for LOCALSTACK/S3/DYNAMODB with parameterized execution and structured output.

# **6. Conclusion**

The implemented RMACS backend demonstrates a complete progression from conceptual design to operational enterprise workflow management. The project now includes end-to-end access governance, project/resource control boundaries, permission delegation logic, and integrated emulator capabilities. Domain entities are persisted with explicit status models and role constraints, and administrative actions are traceable through audit logs and PM history snapshots.

The architecture applies object-oriented separation across controllers, services, repositories, DTOs, and entities, resulting in modular and maintainable code. The emulator subsystem extends the platform from governance-only functionality to practical operational tooling for API testing, network command bridging, and cloud workflow simulation.

# **7. Future Scope**

## **7.1 Technical Enhancements**

* Add token-based authentication and server-side session hardening.
* Add integration tests for emulator endpoints and permission-sensitive controllers.
* Add asynchronous execution mode for long-running collection and AWS workflows.
* Add structured observability (metrics/tracing) for API and emulator operations.

## **7.2 Functional Enhancements**

* Add multi-project portfolio analytics and trend reporting in dashboard APIs.
* Add workflow approvals for role changes and high-risk credential updates.
* Add richer SSH emulator protocol support (full PTY/SSH handshake integration path).
* Add endpoint policy templates for standardized access grant rules.

## **7.3 Infrastructure**

* Containerize backend, frontend, MySQL, and LocalStack in one compose profile.
* Add backup/restore automation for governance-critical tables.
* Add environment-specific config and secrets management for production readiness.

# **8. References**

The following references were used for design and implementation alignment.

## **Books and Academic References**

1. Bloch, J. (2018). Effective Java (3rd ed.). Addison-Wesley Professional.
2. Evans, E. (2003). Domain-Driven Design: Tackling Complexity in the Heart of Software. Addison-Wesley.
3. Fowler, M. (2002). Patterns of Enterprise Application Architecture. Addison-Wesley.

## **Online Documentation and Resources**

1. Spring Boot Reference Documentation: https://docs.spring.io/spring-boot/docs/current/reference/html/
2. Spring Data JPA Documentation: https://docs.spring.io/spring-data/jpa/reference/
3. Java HTTP Client API: https://docs.oracle.com/en/java/javase/23/docs/api/java.net.http/java/net/http/package-summary.html
4. Java Socket API: https://docs.oracle.com/en/java/javase/23/docs/api/java.base/java/net/Socket.html
5. AWS SDK for Java 2.x Guide: https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/home.html
6. LocalStack Documentation: https://docs.localstack.cloud/
7. OWASP Access Control Guidance: https://owasp.org/www-community/Broken_Access_Control

## **Government and Institutional Sources**

1. National Institute of Standards and Technology (NIST). Role-Based Access Control resources: https://csrc.nist.gov/projects/role-based-access-control
2. OWASP Foundation. ASVS and secure software verification guidance: https://owasp.org/ASVS/
