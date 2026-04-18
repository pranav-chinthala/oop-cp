package oop.cp.oop.controller;

import jakarta.validation.Valid;
import oop.cp.oop.dto.*;
import oop.cp.oop.model.*;
import oop.cp.oop.repository.*;
import oop.cp.oop.service.AuditLogService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/resources")
public class ResourceController {

    private final ResourceRepository resourceRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ResourceServiceRepository resourceServiceRepository;
    private final ResourcePermissionRepository resourcePermissionRepository;
    private final ApiEndpointRepository apiEndpointRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ResourceCredentialRepository resourceCredentialRepository;
    private final ApiEndpointPermissionRepository apiEndpointPermissionRepository;
    private final AuditLogService auditLogService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public ResourceController(ResourceRepository resourceRepository,
                              ProjectRepository projectRepository,
                              UserRepository userRepository,
                              ResourceServiceRepository resourceServiceRepository,
                              ResourcePermissionRepository resourcePermissionRepository,
                              ApiEndpointRepository apiEndpointRepository,
                              ProjectMemberRepository projectMemberRepository,
                              ResourceCredentialRepository resourceCredentialRepository,
                              ApiEndpointPermissionRepository apiEndpointPermissionRepository,
                              AuditLogService auditLogService) {
        this.resourceRepository = resourceRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.resourceServiceRepository = resourceServiceRepository;
        this.resourcePermissionRepository = resourcePermissionRepository;
        this.apiEndpointRepository = apiEndpointRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.resourceCredentialRepository = resourceCredentialRepository;
        this.apiEndpointPermissionRepository = apiEndpointPermissionRepository;
        this.auditLogService = auditLogService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> listResources(@RequestParam Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        if (user.getRole() == UserRole.SUPER_ADMIN) {
            return ResponseEntity.ok(resourceRepository.findAll().stream().map(this::toResourceDto).toList());
        }

        Set<Long> resourceIds = new HashSet<>();
        for (ProjectMember member : projectMemberRepository.findByUser_Id(userId)) {
            for (Resource resource : resourceRepository.findByProject_Id(member.getProject().getId())) {
                resourceIds.add(resource.getId());
            }
        }

        resourcePermissionRepository.findByUser_IdAndCanAccessTrue(userId)
                .forEach(permission -> resourceIds.add(permission.getResource().getId()));

        return ResponseEntity.ok(resourceRepository.findAllById(resourceIds).stream().map(this::toResourceDto).toList());
    }

    @GetMapping("/{resourceId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getResource(@PathVariable Long resourceId, @RequestParam(required = false) Long viewerId) {
        Resource resource = resourceRepository.findById(resourceId).orElse(null);
        if (resource == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Resource not found"));
        }

        User viewer = viewerId == null ? null : userRepository.findById(viewerId).orElse(null);

        Map<String, Object> payload = toResourceDto(resource);
        payload.put("services", resourceServiceRepository.findByResource_Id(resourceId).stream().map(service -> Map.of(
                "id", service.getId(),
                "protocol", service.getServiceProtocol(),
                "ipAddress", service.getIpAddress(),
                "port", service.getPort(),
                "metadata", service.getConnectionMetadata()
        )).toList());

        payload.put("permissions", resourcePermissionRepository.findByResource_Id(resourceId).stream().map(permission -> Map.of(
                "id", permission.getId(),
                "userId", permission.getUser().getId(),
                "userName", permission.getUser().getName(),
                "canAccess", permission.isCanAccess(),
                "canGrantAccess", permission.isCanGrantAccess(),
                "grantedBy", permission.getGrantedBy().getId(),
                "grantedAt", permission.getGrantedAt()
        )).toList());

        payload.put("apiEndpoints", apiEndpointRepository.findByResource_Id(resourceId).stream().map(api -> {
            Map<String, Object> endpointMap = new HashMap<>();
            endpointMap.put("id", api.getId());
            endpointMap.put("name", api.getName());
            endpointMap.put("httpMethod", api.getHttpMethod());
            endpointMap.put("url", api.getUrl());
            endpointMap.put("apiKey", api.getApiKey());
            endpointMap.put("projectWideAccess", api.isProjectWideAccess());
            endpointMap.put("permissions", apiEndpointPermissionRepository.findByApiEndpoint_Id(api.getId()).stream().map(permission -> Map.of(
                "id", permission.getId(),
                "userId", permission.getUser().getId(),
                "userName", permission.getUser().getName(),
                "canAccess", permission.isCanAccess(),
                "grantedBy", permission.getGrantedBy().getId(),
                "grantedAt", permission.getGrantedAt()
            )).toList());
            return endpointMap;
        }).toList());

        if (viewer != null && viewer.getRole() == UserRole.SUPER_ADMIN) {
            payload.put("credentials", resourceCredentialRepository.findByResourceService_Resource_Id(resourceId).stream().map(credential -> Map.of(
                "id", credential.getId(),
                "resourceServiceId", credential.getResourceService().getId(),
                "authMethod", credential.getAuthMethod().name(),
                "username", credential.getUsername(),
                "encryptedSecret", credential.getEncryptedSecret(),
                "updatedAt", credential.getUpdatedAt()
            )).toList());
        }

        return ResponseEntity.ok(payload);
    }

    @PostMapping
    public ResponseEntity<?> createResource(@Valid @RequestBody CreateResourceRequest request) {
        Project project = projectRepository.findById(request.projectId()).orElse(null);
        User creator = userRepository.findById(request.createdBy()).orElse(null);

        if (project == null || creator == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Project or creator not found"));
        }

        Resource resource = new Resource();
        resource.setProject(project);
        resource.setName(request.name());
        resource.setResourceType(request.resourceType());
        resource.setCreatedBy(creator);

        Resource saved = resourceRepository.save(resource);

        for (ProjectMember member : projectMemberRepository.findByProject_Id(project.getId())) {
            ResourcePermission permission = new ResourcePermission();
            permission.setResource(saved);
            permission.setUser(member.getUser());
            permission.setCanAccess(true);
            permission.setCanGrantAccess(member.getRole().equalsIgnoreCase("Manager") || member.getUser().getRole() == UserRole.SUPER_ADMIN);
            permission.setGrantedBy(creator);
            resourcePermissionRepository.save(permission);
        }

        auditLogService.log(creator, creator, "RESOURCE_CREATED", "RESOURCE", saved.getId().toString(), saved.getName());

        return ResponseEntity.status(HttpStatus.CREATED).body(toResourceDto(saved));
    }

    @PostMapping("/{resourceId}/services")
    public ResponseEntity<?> addService(@PathVariable Long resourceId, @Valid @RequestBody CreateResourceServiceRequest request) {
        Resource resource = resourceRepository.findById(resourceId).orElse(null);
        if (resource == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Resource not found"));
        }

        ResourceService service = new ResourceService();
        service.setResource(resource);
        service.setServiceProtocol(request.serviceProtocol());
        service.setIpAddress(request.ipAddress());
        service.setPort(request.port());
        service.setConnectionMetadata(request.connectionMetadata());

        ResourceService saved = resourceServiceRepository.save(service);
        auditLogService.log(resource.getCreatedBy(), resource.getCreatedBy(), "RESOURCE_SERVICE_CREATED", "RESOURCE_SERVICE", saved.getId().toString(), saved.getServiceProtocol() + " on port " + saved.getPort());

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{resourceId}/permissions")
    public ResponseEntity<?> grantPermission(@PathVariable Long resourceId, @Valid @RequestBody GrantPermissionRequest request) {
        Resource resource = resourceRepository.findById(resourceId).orElse(null);
        User user = userRepository.findById(request.userId()).orElse(null);
        User grantedBy = userRepository.findById(request.grantedBy()).orElse(null);

        if (resource == null || user == null || grantedBy == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Resource or user not found"));
        }

        boolean isSuperAdmin = grantedBy.getRole() == UserRole.SUPER_ADMIN;
        if (!isSuperAdmin) {
            ResourcePermission grantorPermission = resourcePermissionRepository.findByResource_IdAndUser_Id(resourceId, grantedBy.getId()).orElse(null);
            if (grantorPermission == null || !grantorPermission.isCanAccess() || !grantorPermission.isCanGrantAccess()) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("You are not allowed to grant resource access"));
            }
        }

        ResourcePermission permission = resourcePermissionRepository.findByResource_IdAndUser_Id(resourceId, request.userId())
                .orElseGet(ResourcePermission::new);
        permission.setResource(resource);
        permission.setUser(user);
        permission.setCanAccess(request.canAccess());
        permission.setCanGrantAccess(request.canGrantAccess());
        permission.setGrantedBy(grantedBy);

        resourcePermissionRepository.save(permission);
        auditLogService.log(grantedBy, user, "RESOURCE_PERMISSION_UPDATED", "RESOURCE", resource.getId().toString(), "canAccess=" + request.canAccess() + ", canGrantAccess=" + request.canGrantAccess());
        return ResponseEntity.ok(new ApiResponse("Permission updated"));
    }

    @PostMapping("/{resourceId}/api-endpoints")
    public ResponseEntity<?> createApiEndpoint(@PathVariable Long resourceId, @Valid @RequestBody CreateApiEndpointRequest request) {
        Resource resource = resourceRepository.findById(resourceId).orElse(null);
        if (resource == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Resource not found"));
        }

        ApiEndpoint endpoint = new ApiEndpoint();
        endpoint.setResource(resource);
        endpoint.setName(request.name());
        endpoint.setHttpMethod(request.httpMethod().toUpperCase());
        endpoint.setUrl(request.url());
        endpoint.setApiKey(request.apiKey());
        endpoint.setProjectWideAccess(request.projectWideAccess());

        ApiEndpoint saved = apiEndpointRepository.save(endpoint);
        auditLogService.log(resource.getCreatedBy(), resource.getCreatedBy(), "API_ENDPOINT_CREATED", "API_ENDPOINT", saved.getId().toString(), saved.getHttpMethod() + " " + saved.getUrl());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/{resourceId}/credentials")
    public ResponseEntity<?> upsertCredential(@PathVariable Long resourceId, @Valid @RequestBody UpsertCredentialRequest request) {
        Resource resource = resourceRepository.findById(resourceId).orElse(null);
        User updatedBy = userRepository.findById(request.updatedBy()).orElse(null);
        ResourceService resourceService = resourceServiceRepository.findById(request.resourceServiceId()).orElse(null);

        if (resource == null || updatedBy == null || resourceService == null || !resourceService.getResource().getId().equals(resourceId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Resource/service/user not found"));
        }

        if (updatedBy.getRole() != UserRole.SUPER_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("Only super admins can update credentials"));
        }

        ResourceCredential credential = resourceCredentialRepository.findByResourceService_Id(request.resourceServiceId())
                .orElseGet(ResourceCredential::new);
        credential.setResourceService(resourceService);
        credential.setAuthMethod(AuthMethod.valueOf(request.authMethod().toUpperCase()));
        credential.setUsername(request.username());
        credential.setEncryptedSecret(passwordEncoder.encode(request.secret()));
        credential.setUpdatedAt(LocalDateTime.now());

        ResourceCredential saved = resourceCredentialRepository.save(credential);
        auditLogService.log(updatedBy, updatedBy, "RESOURCE_CREDENTIAL_UPSERT", "RESOURCE_CREDENTIAL", saved.getId().toString(), "Service " + resourceService.getId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{resourceId}/credentials")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listCredentials(@PathVariable Long resourceId, @RequestParam Long viewerId) {
        User viewer = userRepository.findById(viewerId).orElse(null);
        if (viewer == null || viewer.getRole() != UserRole.SUPER_ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("Only super admins can view credentials"));
        }

        return ResponseEntity.ok(resourceCredentialRepository.findByResourceService_Resource_Id(resourceId).stream().map(credential -> Map.of(
                "id", credential.getId(),
                "resourceServiceId", credential.getResourceService().getId(),
                "authMethod", credential.getAuthMethod().name(),
                "username", credential.getUsername(),
                "encryptedSecret", credential.getEncryptedSecret(),
                "updatedAt", credential.getUpdatedAt()
        )).toList());
    }

    @PostMapping("/{resourceId}/api-endpoints/{endpointId}/permissions")
    public ResponseEntity<?> grantEndpointAccess(@PathVariable Long resourceId,
                                                 @PathVariable Long endpointId,
                                                 @Valid @RequestBody GrantEndpointAccessRequest request) {
        ApiEndpoint endpoint = apiEndpointRepository.findById(endpointId).orElse(null);
        User targetUser = userRepository.findById(request.userId()).orElse(null);
        User grantedBy = userRepository.findById(request.grantedBy()).orElse(null);

        if (endpoint == null || targetUser == null || grantedBy == null || !endpoint.getResource().getId().equals(resourceId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Endpoint or users not found"));
        }

        if (grantedBy.getRole() == UserRole.EMPLOYEE) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("Only PMs or super admins can grant endpoint access"));
        }

        ApiEndpointPermission permission = apiEndpointPermissionRepository.findByApiEndpoint_IdAndUser_Id(endpointId, request.userId())
                .orElseGet(ApiEndpointPermission::new);
        permission.setApiEndpoint(endpoint);
        permission.setUser(targetUser);
        permission.setCanAccess(request.canAccess());
        permission.setGrantedBy(grantedBy);
        permission.setGrantedAt(LocalDateTime.now());
        apiEndpointPermissionRepository.save(permission);

        auditLogService.log(grantedBy, targetUser, "API_ENDPOINT_PERMISSION_UPDATED", "API_ENDPOINT", endpoint.getId().toString(), "canAccess=" + request.canAccess());
        return ResponseEntity.ok(new ApiResponse("Endpoint access updated"));
    }

    @GetMapping("/{resourceId}/api-endpoints/{endpointId}/permissions")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listEndpointAccess(@PathVariable Long resourceId, @PathVariable Long endpointId) {
        ApiEndpoint endpoint = apiEndpointRepository.findById(endpointId).orElse(null);
        if (endpoint == null || !endpoint.getResource().getId().equals(resourceId)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Endpoint not found"));
        }

        return ResponseEntity.ok(apiEndpointPermissionRepository.findByApiEndpoint_Id(endpointId).stream().map(permission -> Map.of(
                "id", permission.getId(),
                "userId", permission.getUser().getId(),
                "userName", permission.getUser().getName(),
                "canAccess", permission.isCanAccess(),
                "grantedBy", permission.getGrantedBy().getId(),
                "grantedAt", permission.getGrantedAt()
        )).toList());
    }

    private Map<String, Object> toResourceDto(Resource resource) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", resource.getId());
        map.put("name", resource.getName());
        map.put("projectId", resource.getProject().getId());
        map.put("projectName", resource.getProject().getName());
        map.put("resourceType", resource.getResourceType());
        map.put("status", resource.getStatus().name());
        map.put("createdBy", resource.getCreatedBy().getId());
        map.put("createdByName", resource.getCreatedBy().getName());
        map.put("createdAt", resource.getCreatedAt());
        return map;
    }
}
