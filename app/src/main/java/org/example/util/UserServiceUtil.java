package org.example.util;

import org.mindrot.jbcrypt.BCrypt;

public class UserServiceUtil {

    public static String hashPassword(String password) {
        return BCrypt.hashpw(password, BCrypt.gensalt(10));
    }

    public static boolean checkPassword(String enteredPassword, String hashedPassword) {
        //System.out.println("Checking password - Entered: [" + enteredPassword + "], Stored: [" + hashedPassword + "]"); // ADD THIS LINE
        return BCrypt.checkpw(enteredPassword, hashedPassword);
    }
}
