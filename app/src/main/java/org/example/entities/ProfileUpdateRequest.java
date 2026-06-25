package org.example.entities;

/** DTO for PUT /api/profile — updates non-auth profile fields only. */
public class ProfileUpdateRequest {
    private String userId;
    private String firstName;
    private String lastName;
    private String age;
    private String phone;

    public ProfileUpdateRequest() {}

    public String getUserId()    { return userId; }
    public String getFirstName() { return firstName; }
    public String getLastName()  { return lastName; }
    public String getAge()       { return age; }
    public String getPhone()     { return phone; }

    public void setUserId(String userId)       { this.userId = userId; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public void setLastName(String lastName)   { this.lastName = lastName; }
    public void setAge(String age)             { this.age = age; }
    public void setPhone(String phone)         { this.phone = phone; }
}
