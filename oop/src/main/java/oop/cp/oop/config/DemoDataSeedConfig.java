package oop.cp.oop.config;

import oop.cp.oop.model.*;
import oop.cp.oop.repository.*;
import oop.cp.oop.service.AuditLogService;
import oop.cp.oop.service.ProjectManagerHistoryService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;

@Configuration
public class DemoDataSeedConfig {

    @Bean
    CommandLineRunner seedDemoData(UserRepository userRepository,
                                   ProjectRepository projectRepository,
                                   ProjectMemberRepository projectMemberRepository,
                                   ResourceRepository resourceRepository,
                                   ResourceServiceRepository resourceServiceRepository,
                                   ResourcePermissionRepository resourcePermissionRepository,
                                   ResourceCredentialRepository resourceCredentialRepository,
                                   ApiEndpointRepository apiEndpointRepository,
                                   ApiEndpointPermissionRepository apiEndpointPermissionRepository,
                                   AccessRequestRepository accessRequestRepository,
                                   ProjectManagerHistoryRepository projectManagerHistoryRepository,
                                   AuditLogRepository auditLogRepository,
                                   ProjectManagerHistoryService projectManagerHistoryService,
                                   AuditLogService auditLogService) {
        return args -> {
            User bootstrapAdmin = userRepository.findByEmailIgnoreCase("admin@oop.local").orElse(null);
            if (bootstrapAdmin == null) {
                return;
            }

            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

            User neelima = createUserIfMissing(userRepository, "Neelima Satam", "neelima.satam@avantra-enterprise.com", UserRole.SUPER_ADMIN, bootstrapAdmin, encoder);
            User aadit = createUserIfMissing(userRepository, "Aadit Bhalerao", "aadit.bhalerao@avantra-enterprise.com", UserRole.PROJECT_MANAGER, neelima, encoder);
            User mihika = createUserIfMissing(userRepository, "Mihika Pathare", "mihika.pathare@avantra-enterprise.com", UserRole.PROJECT_MANAGER, neelima, encoder);

            User rhea = createUserIfMissing(userRepository, "Rhea Gaitonde", "rhea.gaitonde@avantra-enterprise.com", UserRole.EMPLOYEE, neelima, encoder);
            User kunal = createUserIfMissing(userRepository, "Kunal Karnik", "kunal.karnik@avantra-enterprise.com", UserRole.EMPLOYEE, neelima, encoder);
            User ananya = createUserIfMissing(userRepository, "Ananya Moghe", "ananya.moghe@avantra-enterprise.com", UserRole.EMPLOYEE, neelima, encoder);
            User soham = createUserIfMissing(userRepository, "Soham Barve", "soham.barve@avantra-enterprise.com", UserRole.EMPLOYEE, neelima, encoder);

            User ishaanPending = createUserIfMissing(userRepository, "Ishaan Pendse", "ishaan.pendse@avantra-enterprise.com", UserRole.PENDING, null, encoder);
            User sanyaPending = createUserIfMissing(userRepository, "Sanya Rege", "sanya.rege@avantra-enterprise.com", UserRole.PENDING, null, encoder);

            createPendingRequestIfMissing(accessRequestRepository, ishaanPending, "Requesting access for infrastructure observability operations.");
            createPendingRequestIfMissing(accessRequestRepository, sanyaPending, "Requesting access for API support and escalation workflows.");

            if (!historyExists(projectManagerHistoryRepository, PmStatus.ACTIVE, aadit.getEmail())) {
                projectManagerHistoryService.record(aadit, neelima, PmStatus.ACTIVE, "Added as project manager for governance program.");
            }
            if (!historyExists(projectManagerHistoryRepository, PmStatus.ACTIVE, mihika.getEmail())) {
                projectManagerHistoryService.record(mihika, neelima, PmStatus.ACTIVE, "Added as project manager for service orchestration.");
            }

            if (!historyExists(projectManagerHistoryRepository, PmStatus.ROLE_CHANGED, "vedika.kelkar@avantra-enterprise.com")) {
                ProjectManagerHistory roleChanged = new ProjectManagerHistory();
                roleChanged.setUserIdSnapshot(9001L);
                roleChanged.setUserNameSnapshot("Vedika Kelkar");
                roleChanged.setUserEmailSnapshot("vedika.kelkar@avantra-enterprise.com");
                roleChanged.setStatus(PmStatus.ROLE_CHANGED);
                roleChanged.setChangedByUserId(neelima.getId());
                roleChanged.setChangedByName(neelima.getName());
                roleChanged.setNote("Transitioned from project manager to architecture specialist role.");
                projectManagerHistoryRepository.save(roleChanged);
            }

            if (!historyExists(projectManagerHistoryRepository, PmStatus.REMOVED, "niranjan.bhide@avantra-enterprise.com")) {
                ProjectManagerHistory removed = new ProjectManagerHistory();
                removed.setUserIdSnapshot(9002L);
                removed.setUserNameSnapshot("Niranjan Bhide");
                removed.setUserEmailSnapshot("niranjan.bhide@avantra-enterprise.com");
                removed.setStatus(PmStatus.REMOVED);
                removed.setChangedByUserId(neelima.getId());
                removed.setChangedByName(neelima.getName());
                removed.setNote("Removed after portfolio reorganization.");
                projectManagerHistoryRepository.save(removed);
            }

            Project governanceProject = createProjectIfMissing(projectRepository,
                    "Enterprise Access Governance Modernization",
                    "Standardization of access controls and review workflows across production platforms.",
                    ProjectStatus.IN_PROGRESS,
                    aadit);

            Project orchestrationProject = createProjectIfMissing(projectRepository,
                    "Secure Infrastructure Service Orchestration",
                    "Provisioning and governance of service endpoints across managed infrastructure domains.",
                    ProjectStatus.INITIATED,
                    mihika);

            Project reliabilityProject = createProjectIfMissing(projectRepository,
                    "Operational API Reliability Enhancement Program",
                    "Hardening endpoint resiliency and access assurance for internal service consumers.",
                    ProjectStatus.FINISHED,
                    aadit);

            addMemberIfMissing(projectMemberRepository, governanceProject, aadit, "Manager", neelima);
            addMemberIfMissing(projectMemberRepository, governanceProject, rhea, "Member", aadit);
            addMemberIfMissing(projectMemberRepository, governanceProject, kunal, "Member", aadit);

            addMemberIfMissing(projectMemberRepository, orchestrationProject, mihika, "Manager", neelima);
            addMemberIfMissing(projectMemberRepository, orchestrationProject, ananya, "Member", mihika);
            addMemberIfMissing(projectMemberRepository, orchestrationProject, soham, "Member", mihika);

            addMemberIfMissing(projectMemberRepository, reliabilityProject, aadit, "Manager", neelima);
            addMemberIfMissing(projectMemberRepository, reliabilityProject, ananya, "Member", aadit);

            Resource policyCluster = createResourceIfMissing(resourceRepository, governanceProject,
                    "Policy Evaluation Cluster", "Kubernetes Cluster", ResourceStatus.PROVISIONED, aadit);
            Resource complianceGateway = createResourceIfMissing(resourceRepository, governanceProject,
                    "Compliance Gateway Node", "Linux VM", ResourceStatus.MAINTENANCE, aadit);
            Resource serviceMeshHub = createResourceIfMissing(resourceRepository, orchestrationProject,
                    "Service Mesh Control Hub", "Container Platform", ResourceStatus.PROVISIONED, mihika);

            ResourceService policyHttp = createServiceIfMissing(resourceServiceRepository, policyCluster, "HTTPS", "10.40.12.18", 8443, "Primary policy API ingress");
            ResourceService policySsh = createServiceIfMissing(resourceServiceRepository, policyCluster, "SSH", "10.40.12.18", 22, "Operations shell access");
            ResourceService gatewayHttp = createServiceIfMissing(resourceServiceRepository, complianceGateway, "HTTPS", "10.40.12.27", 9443, "Compliance reporting ingress");
            ResourceService meshApi = createServiceIfMissing(resourceServiceRepository, serviceMeshHub, "HTTPS", "10.40.18.11", 9444, "Service mesh governance API");

            addResourcePermissionIfMissing(resourcePermissionRepository, policyCluster, aadit, true, true, neelima);
            addResourcePermissionIfMissing(resourcePermissionRepository, policyCluster, rhea, true, false, aadit);
            addResourcePermissionIfMissing(resourcePermissionRepository, policyCluster, kunal, true, false, aadit);
            addResourcePermissionIfMissing(resourcePermissionRepository, complianceGateway, aadit, true, true, neelima);
            addResourcePermissionIfMissing(resourcePermissionRepository, complianceGateway, kunal, true, false, aadit);
            addResourcePermissionIfMissing(resourcePermissionRepository, serviceMeshHub, mihika, true, true, neelima);
            addResourcePermissionIfMissing(resourcePermissionRepository, serviceMeshHub, ananya, true, false, mihika);

            ApiEndpoint accessReviewEndpoint = createApiEndpointIfMissing(apiEndpointRepository, policyCluster,
                    "Access Review Trigger API", "POST", "https://policy-gateway.avantra.internal/api/v1/reviews/trigger", "AK-REV-7849-ENP", true);
            ApiEndpoint entitlementLookupEndpoint = createApiEndpointIfMissing(apiEndpointRepository, policyCluster,
                    "Entitlement Lookup API", "GET", "https://policy-gateway.avantra.internal/api/v1/entitlements", "AK-ENT-9931-ENP", false);
            ApiEndpoint complianceExportEndpoint = createApiEndpointIfMissing(apiEndpointRepository, complianceGateway,
                    "Compliance Export API", "POST", "https://compliance-node.avantra.internal/api/v1/export", "AK-CMP-2108-ENP", false);

            addApiPermissionIfMissing(apiEndpointPermissionRepository, accessReviewEndpoint, rhea, true, aadit);
            addApiPermissionIfMissing(apiEndpointPermissionRepository, entitlementLookupEndpoint, kunal, true, aadit);
            addApiPermissionIfMissing(apiEndpointPermissionRepository, complianceExportEndpoint, ananya, true, aadit);

            addCredentialIfMissing(resourceCredentialRepository, policyHttp, AuthMethod.TOKEN, "policy_api_operator", encoder.encode("POLICY-OPS-SECURE-KEY"));
            addCredentialIfMissing(resourceCredentialRepository, policySsh, AuthMethod.SSH_KEY, "ops_automation", encoder.encode("ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDemoSeed"));
            addCredentialIfMissing(resourceCredentialRepository, gatewayHttp, AuthMethod.PASSWORD, "compliance_automation", encoder.encode("Cmp!Gateway#2026"));
            addCredentialIfMissing(resourceCredentialRepository, meshApi, AuthMethod.TOKEN, "mesh_service_ops", encoder.encode("MESH-GOV-API-TOKEN-2026"));

                createSeedAuditIfMissing(auditLogRepository, auditLogService, neelima, aadit,
                    "DEMO_SEED_PM_ASSIGNMENT", "USER", aadit.getId().toString(),
                    "Assigned as manager for Enterprise Access Governance Modernization");
                createSeedAuditIfMissing(auditLogRepository, auditLogService, neelima, mihika,
                    "DEMO_SEED_PM_ASSIGNMENT", "USER", mihika.getId().toString(),
                    "Assigned as manager for Secure Infrastructure Service Orchestration");
                createSeedAuditIfMissing(auditLogRepository, auditLogService, aadit, rhea,
                    "DEMO_SEED_RESOURCE_ACCESS", "RESOURCE", policyCluster.getId().toString(),
                    "Granted resource access for policy review workflows");
                createSeedAuditIfMissing(auditLogRepository, auditLogService, aadit, kunal,
                    "DEMO_SEED_ENDPOINT_ACCESS", "API_ENDPOINT", entitlementLookupEndpoint.getId().toString(),
                    "Granted endpoint access for entitlement analysis");
        };
    }

            private void createSeedAuditIfMissing(AuditLogRepository auditLogRepository,
                              AuditLogService auditLogService,
                              User actor,
                              User target,
                              String actionType,
                              String entityType,
                              String entityId,
                              String details) {
            boolean exists = auditLogRepository.findAll().stream().anyMatch(log ->
                actionType.equals(log.getActionType())
                    && entityType.equals(log.getEntityType())
                    && entityId.equals(log.getEntityId())
                    && details.equals(log.getDetails())
            );
            if (!exists) {
                auditLogService.log(actor, target, actionType, entityType, entityId, details);
            }
            }

    private User createUserIfMissing(UserRepository userRepository,
                                     String name,
                                     String email,
                                     UserRole role,
                                     User addedBy,
                                     BCryptPasswordEncoder encoder) {
        Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            return existing.get();
        }
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setRole(role);
        user.setAddedBy(addedBy);
        user.setPasswordHash(encoder.encode("Welcome@123"));
        return userRepository.save(user);
    }

    private void createPendingRequestIfMissing(AccessRequestRepository repository, User user, String reason) {
        if (user == null) {
            return;
        }
        Optional<AccessRequest> existing = repository.findTopByUser_IdOrderByRequestedAtDesc(user.getId());
        if (existing.isPresent() && existing.get().getStatus() == AccessRequestStatus.PENDING) {
            return;
        }
        AccessRequest request = new AccessRequest();
        request.setUser(user);
        request.setRequestReason(reason);
        request.setStatus(AccessRequestStatus.PENDING);
        repository.save(request);
    }

    private boolean historyExists(ProjectManagerHistoryRepository repository, PmStatus status, String email) {
        return repository.findByStatusOrderByChangedAtDesc(status)
                .stream()
                .anyMatch(item -> item.getUserEmailSnapshot().equalsIgnoreCase(email));
    }

    private Project createProjectIfMissing(ProjectRepository projectRepository,
                                           String name,
                                           String description,
                                           ProjectStatus status,
                                           User creator) {
        return projectRepository.findAll().stream()
                .filter(project -> project.getName().equalsIgnoreCase(name))
                .findFirst()
                .orElseGet(() -> {
                    Project project = new Project();
                    project.setName(name);
                    project.setDescription(description);
                    project.setStatus(status);
                    project.setCreatedBy(creator);
                    return projectRepository.save(project);
                });
    }

    private void addMemberIfMissing(ProjectMemberRepository repository,
                                    Project project,
                                    User user,
                                    String role,
                                    User addedBy) {
        ProjectMemberId id = new ProjectMemberId(project.getId(), user.getId());
        if (repository.findById(id).isPresent()) {
            return;
        }
        ProjectMember member = new ProjectMember();
        member.setId(id);
        member.setProject(project);
        member.setUser(user);
        member.setRole(role);
        member.setAddedBy(addedBy);
        repository.save(member);
    }

    private Resource createResourceIfMissing(ResourceRepository repository,
                                             Project project,
                                             String name,
                                             String type,
                                             ResourceStatus status,
                                             User creator) {
        List<Resource> resources = repository.findByProject_Id(project.getId());
        for (Resource resource : resources) {
            if (resource.getName().equalsIgnoreCase(name)) {
                return resource;
            }
        }
        Resource resource = new Resource();
        resource.setProject(project);
        resource.setName(name);
        resource.setResourceType(type);
        resource.setStatus(status);
        resource.setCreatedBy(creator);
        return repository.save(resource);
    }

    private ResourceService createServiceIfMissing(ResourceServiceRepository repository,
                                                   Resource resource,
                                                   String protocol,
                                                   String ip,
                                                   int port,
                                                   String metadata) {
        for (ResourceService service : repository.findByResource_Id(resource.getId())) {
            if (service.getServiceProtocol().equalsIgnoreCase(protocol) && service.getPort() == port) {
                return service;
            }
        }
        ResourceService service = new ResourceService();
        service.setResource(resource);
        service.setServiceProtocol(protocol);
        service.setIpAddress(ip);
        service.setPort(port);
        service.setConnectionMetadata(metadata);
        return repository.save(service);
    }

    private void addResourcePermissionIfMissing(ResourcePermissionRepository repository,
                                                Resource resource,
                                                User user,
                                                boolean canAccess,
                                                boolean canGrant,
                                                User grantedBy) {
        if (repository.findByResource_IdAndUser_Id(resource.getId(), user.getId()).isPresent()) {
            return;
        }
        ResourcePermission permission = new ResourcePermission();
        permission.setResource(resource);
        permission.setUser(user);
        permission.setCanAccess(canAccess);
        permission.setCanGrantAccess(canGrant);
        permission.setGrantedBy(grantedBy);
        repository.save(permission);
    }

    private ApiEndpoint createApiEndpointIfMissing(ApiEndpointRepository repository,
                                                   Resource resource,
                                                   String name,
                                                   String method,
                                                   String url,
                                                   String key,
                                                   boolean projectWideAccess) {
        for (ApiEndpoint endpoint : repository.findByResource_Id(resource.getId())) {
            if (endpoint.getName().equalsIgnoreCase(name)) {
                return endpoint;
            }
        }
        ApiEndpoint endpoint = new ApiEndpoint();
        endpoint.setResource(resource);
        endpoint.setName(name);
        endpoint.setHttpMethod(method);
        endpoint.setUrl(url);
        endpoint.setApiKey(key);
        endpoint.setProjectWideAccess(projectWideAccess);
        return repository.save(endpoint);
    }

    private void addApiPermissionIfMissing(ApiEndpointPermissionRepository repository,
                                           ApiEndpoint endpoint,
                                           User user,
                                           boolean canAccess,
                                           User grantedBy) {
        if (repository.findByApiEndpoint_IdAndUser_Id(endpoint.getId(), user.getId()).isPresent()) {
            return;
        }
        ApiEndpointPermission permission = new ApiEndpointPermission();
        permission.setApiEndpoint(endpoint);
        permission.setUser(user);
        permission.setCanAccess(canAccess);
        permission.setGrantedBy(grantedBy);
        repository.save(permission);
    }

    private void addCredentialIfMissing(ResourceCredentialRepository repository,
                                        ResourceService service,
                                        AuthMethod method,
                                        String username,
                                        String encryptedSecret) {
        if (repository.findByResourceService_Id(service.getId()).isPresent()) {
            return;
        }
        ResourceCredential credential = new ResourceCredential();
        credential.setResourceService(service);
        credential.setAuthMethod(method);
        credential.setUsername(username);
        credential.setEncryptedSecret(encryptedSecret);
        repository.save(credential);
    }
}
