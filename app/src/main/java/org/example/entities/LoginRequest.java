package org.example.entities;

/**
 * DTO received by POST /api/login.
 * Contains plain-text credentials; password is never stored after validation.
 */
public class LoginRequest {
    private String name;
    private String password;

    public LoginRequest() {}

    public String getName()     { return name; }
    public String getPassword() { return password; }
    public void setName(String name)         { this.name = name; }
    public void setPassword(String password) { this.password = password; }
}
