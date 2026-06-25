package org.example.entities;

/**
 * DTO returned by POST /api/login on success.
 * token is a JWT — frontend stores it and sends as "Authorization: Bearer <token>".
 */
public class LoginResponse {
    private String userId;
    private String name;
    private String role;
    private String token;
    private String message;

    public LoginResponse(String userId, String name, String role, String token, String message) {
        this.userId  = userId;
        this.name    = name;
        this.role    = role;
        this.token   = token;
        this.message = message;
    }

    public String getUserId()  { return userId; }
    public String getName()    { return name; }
    public String getRole()    { return role; }
    public String getToken()   { return token; }
    public String getMessage() { return message; }
}
