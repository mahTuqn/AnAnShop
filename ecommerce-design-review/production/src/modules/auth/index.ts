import { AppError, Clock, Result, email, err, ok, systemClock, uuid } from "../shared";

export type UserStatus = "PENDING_VERIFICATION" | "ACTIVE" | "BLOCKED";
export interface User {
  id: string;
  email: string;
  fullName: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
}
export interface PublicUser { id: string; email: string; fullName: string; status: UserStatus }
export interface AuthSession { token: string; user: PublicUser; expiresAt: Date }

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<void>;
}
export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encoded: string): Promise<boolean>;
}
export interface SessionIssuer { issue(user: PublicUser): Promise<AuthSession> }

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordHasher,
    private readonly sessions: SessionIssuer,
    private readonly clock: Clock = systemClock,
    private readonly config: { requireEmailVerification?: boolean } = {},
  ) {}

  async register(input: { email: string; password: string; fullName: string }): Promise<Result<PublicUser>> {
    const normalizedEmail = email(input.email);
    if (input.password.length < 8 || input.password.length > 128 || !/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) return err(new AppError("VALIDATION_ERROR", "Mật khẩu phải có 8–128 ký tự", 400));
    const fullName = input.fullName.trim();
    if (fullName.length < 2 || fullName.length > 150) return err(new AppError("VALIDATION_ERROR", "Họ tên không hợp lệ", 400));
    if (await this.users.findByEmail(normalizedEmail)) return err(new AppError("CONFLICT", "Email đã được sử dụng", 409));
    const user: User = { id: uuid("usr"), email: normalizedEmail, fullName, passwordHash: await this.passwords.hash(input.password), status: this.config.requireEmailVerification ? "PENDING_VERIFICATION" : "ACTIVE", createdAt: this.clock.now() };
    await this.users.create(user);
    return ok(toPublicUser(user));
  }

  async login(input: { email: string; password: string }): Promise<Result<AuthSession>> {
    const user = await this.users.findByEmail(email(input.email));
    if (!user || !(await this.passwords.verify(input.password, user.passwordHash))) return err(new AppError("UNAUTHORIZED", "Email hoặc mật khẩu không đúng", 401));
    if (user.status === "BLOCKED") return err(new AppError("FORBIDDEN", "Tài khoản đã bị khóa", 403));
    if (user.status === "PENDING_VERIFICATION" && this.config.requireEmailVerification) return err(new AppError("FORBIDDEN", "Vui lòng xác minh email trước khi đăng nhập", 403));
    return ok(await this.sessions.issue(toPublicUser(user)));
  }
}

export const toPublicUser = ({ id, email: userEmail, fullName, status }: User): PublicUser => ({ id, email: userEmail, fullName, status });

