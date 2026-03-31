package oop.cp.oop.config;

import oop.cp.oop.model.User;
import oop.cp.oop.model.UserRole;
import oop.cp.oop.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@Configuration
public class BootstrapDataConfig {

    @Bean
    CommandLineRunner bootstrap(UserRepository userRepository) {
        return args -> {
            if (userRepository.findByEmailIgnoreCase("admin@oop.local").isEmpty()) {
                User admin = new User();
                admin.setName("System Admin");
                admin.setEmail("admin@oop.local");
                admin.setPasswordHash(new BCryptPasswordEncoder().encode("Admin@123"));
                admin.setRole(UserRole.SUPER_ADMIN);
                userRepository.save(admin);
            }
        };
    }
}
