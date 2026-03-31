package oop.cp.oop.repository;

import oop.cp.oop.model.User;
import oop.cp.oop.model.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findByRole(UserRole role);
    List<User> findByEmailContainingIgnoreCase(String email);
    long countByRole(UserRole role);
}
