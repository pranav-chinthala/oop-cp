package oop.cp.oop.controller;

import jakarta.validation.Valid;
import oop.cp.oop.dto.ApiResponse;
import oop.cp.oop.dto.SaveSshProfileRequest;
import oop.cp.oop.model.SshProfile;
import oop.cp.oop.model.User;
import oop.cp.oop.repository.SshProfileRepository;
import oop.cp.oop.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/ssh/profiles")
public class SshProfileController {

    private final SshProfileRepository sshProfileRepository;
    private final UserRepository userRepository;

    public SshProfileController(SshProfileRepository sshProfileRepository,
                                UserRepository userRepository) {
        this.sshProfileRepository = sshProfileRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> listProfiles(@RequestParam Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        return ResponseEntity.ok(sshProfileRepository.findByUser_IdOrderByUpdatedAtDesc(userId)
                .stream()
                .map(this::toDto)
                .toList());
    }

    @PostMapping
    public ResponseEntity<?> saveProfile(@Valid @RequestBody SaveSshProfileRequest request) {
        User user = userRepository.findById(request.userId()).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        SshProfile profile = sshProfileRepository
                .findByUser_IdAndNameIgnoreCase(request.userId(), request.name().trim())
                .orElseGet(SshProfile::new);

        profile.setUser(user);
        profile.setName(request.name().trim());
        profile.setHost(request.host().trim());
        profile.setPort(request.port());
        profile.setUsername(request.username().trim());
        profile.setPtyType(request.ptyType().trim());
        if (profile.getCreatedAt() == null) {
            profile.setCreatedAt(LocalDateTime.now());
        }
        profile.setUpdatedAt(LocalDateTime.now());

        SshProfile saved = sshProfileRepository.save(profile);
        return ResponseEntity.ok(toDto(saved));
    }

    @DeleteMapping("/{profileId}")
    public ResponseEntity<?> deleteProfile(@PathVariable Long profileId, @RequestParam Long userId) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("User not found"));
        }

        SshProfile profile = sshProfileRepository.findById(profileId).orElse(null);
        if (profile == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiResponse("Profile not found"));
        }

        if (!profile.getUser().getId().equals(userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ApiResponse("You can only delete your own profiles"));
        }

        sshProfileRepository.delete(profile);
        return ResponseEntity.ok(new ApiResponse("Profile deleted"));
    }

    private Map<String, Object> toDto(SshProfile profile) {
        return Map.of(
                "id", profile.getId(),
                "name", profile.getName(),
                "host", profile.getHost(),
                "port", profile.getPort(),
                "username", profile.getUsername(),
                "ptyType", profile.getPtyType(),
                "updatedAt", profile.getUpdatedAt()
        );
    }
}
