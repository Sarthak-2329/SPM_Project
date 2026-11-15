# Login Sequence Diagram — Campus CMMS

## Title
**SEQ-07: User Authentication & JWT Issuance Sequence Diagram (FR-01)**

---

## Diagram

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Admin / Tech / Requester)
    participant Browser as React SPA Client
    participant AuthMW as Express Auth / Rate Limit
    participant AuthCtrl as AuthController
    participant AuthSvc as AuthService
    participant UserRepo as UserRepository
    participant AuditSvc as AuditService
    participant DB as PostgreSQL (Prisma)

    User->>Browser: Enters email and password on /login
    Browser->>AuthMW: POST /api/auth/login { email, password }
    AuthMW->>AuthCtrl: Validate payload (Zod schema)
    AuthCtrl->>AuthSvc: login({ email, password }, clientIp)
    
    AuthSvc->>UserRepo: findByEmail(email.toLowerCase())
    UserRepo->>DB: SELECT * FROM users WHERE email = $1
    DB-->>UserRepo: Return user record (with hashed password)
    UserRepo-->>AuthSvc: User entity

    alt User Not Found OR Inactive
        AuthSvc-->>AuthCtrl: Throw 401 / 403 Error
        AuthCtrl-->>Browser: { success: false, message: "Invalid credentials" }
        Browser-->>User: Display error banner
    else User Valid & Active
        AuthSvc->>AuthSvc: bcrypt.compare(password, user.password)
        alt Password Mismatch
            AuthSvc-->>AuthCtrl: Throw 401 "Invalid credentials"
            AuthCtrl-->>Browser: { success: false, message: "Invalid credentials" }
            Browser-->>User: Display error banner
        else Password Valid
            AuthSvc->>AuthSvc: jwt.sign({ id, email, role, name }, JWT_SECRET, { expiresIn: '24h' })
            AuthSvc->>AuditSvc: log({ action: 'USER_LOGIN', entityType: 'User', userId })
            AuditSvc->>DB: INSERT INTO audit_logs ...
            AuthSvc-->>AuthCtrl: Return { user, token }
            AuthCtrl-->>Browser: 200 OK { success: true, data: { user, token } }
            Browser->>Browser: Store token in localStorage ('cmms_token')
            Browser->>Browser: Update React AuthContext state
            Browser-->>User: Redirect to role-specific dashboard (/dashboard or /assets)
        end
    end
```

---

## Plain-English Walkthrough (Viva Notes)

This sequence diagram illustrates the step-by-step authentication mechanism satisfying **FR-01** and **NFR-01**.

1. The user inputs their campus credentials into the React client.
2. The frontend dispatches an asynchronous HTTP POST request to `/api/auth/login`.
3. Express parses the payload and applies Zod validation to ensure non-empty and well-formed email/password fields before passing execution to `AuthController`.
4. `AuthService` normalises the email and fetches the corresponding record from the PostgreSQL `users` table via `UserRepository`.
5. If the user does not exist or has been marked inactive (`isActive: false`), the service immediately halts execution with a generic error, preventing account enumeration attacks.
6. The service compares the candidate plaintext password against the stored bcrypt hash using constant-time comparison.
7. Upon successful verification, a cryptographically signed JWT access token is generated containing the user's role and identity, and an asynchronous audit trail entry is inserted into `audit_logs`.
8. The client securely persists the JWT in browser local storage and configures Axios request interceptors to automatically attach the `Authorization: Bearer <token>` header to all subsequent API requests.
