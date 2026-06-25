package org.example.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class User {

    @Id
    @Column(name = "user_id")
    private String userId;

    @Column(name = "name", unique = true, nullable = false)
    private String name;

    @JsonIgnore
    @Column(name = "hashed_password")
    private String hashedPassword;

    @Transient
    private String password;

    @Column(name = "first_name")  private String firstName;
    @Column(name = "last_name")   private String lastName;
    @Column(name = "age")         private String age;
    @Column(name = "phone")       private String phone;

    @Column(name = "role", nullable = false)
    private String role = "USER";

    /** Admin can suspend a user to block login */
    @Column(name = "suspended", nullable = false)
    private boolean suspended = false;

    /** ISO datetime string of last successful login */
    @Column(name = "last_login")
    private String lastLogin;

    public User(String name, String password, String hashedPassword, String userId) {
        this.name = name; this.password = password;
        this.hashedPassword = hashedPassword; this.userId = userId;
        this.role = "USER"; this.suspended = false;
    }
}
