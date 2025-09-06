import { sign as JwtSign } from "hono/jwt";
import sql from "../db";
import { sendEmail } from "../sendEmail";

export const signup = async (c: any) => {
  const {
    full_name,
    profile_pic,
    mist_id,
    batch_details,
    mist_id_card,
    email,
    phone,
    password,
  } = await c.req.json();
  console.log(
    full_name,
    profile_pic,
    mist_id,
    batch_details,
    mist_id_card,
    email,
    phone,
    password
  );
  try {
    // Validate password length
    if (!password || password.length < 8) {
      return c.json(
        { error: "Password must be at least 8 characters long" },
        400
      );
    }

    const exists = await sql`select * from users where email = ${email}`;
    if (exists.length > 0) {
      return c.json({ error: "This email already exists" }, 400);
    }
    const hash = await Bun.password.hash(password);
    const result =
      await sql`INSERT INTO users (full_name, profile_pic, mist_id, mist_id_card, email, phone, password)
        VALUES (${full_name}, ${profile_pic}, ${Number(
        mist_id
      )}, ${mist_id_card}, ${email}, ${phone}, ${hash})
        RETURNING *`;
    return c.json({ result });
  } catch (error) {
    console.log(error);
    return c.json({ error: "error" }, 400);
  }
};

export const login = async (c: any) => {
  const { email, password } = await c.req.json();
  try {
    const result = await sql`select * from users where email = ${email}`;
    if (result.length === 0) {
      return c.json({ error: "Invalid email or password" }, 400);
    }
    const isMatch = await Bun.password.verify(password, result[0].password);
    if (!isMatch) {
      return c.json({ error: "Invalid email or password" }, 400);
    }
    const secret = process.env.SECRET;
    if (!secret) {
      console.log("JWT secret is not defined");
      return c.json({ error: "Internal server error" }, 500);
    }
    const token = await JwtSign({ email, id: result[0].id }, secret);
    return c.json({ result, token, admin: result[0].admin });
  } catch (error) {
    console.log(error);
    return c.json({ error: "Something went wrong" }, 400);
  }
};

export const getProfile = async (c: any) => {
  const { id, email } = c.get("jwtPayload");
  try {
    const result =
      await sql`select * from users where id = ${id} and email = ${email}`;
    return c.json({ result });
  } catch (error) {
    console.log(error);
    return c.json({ error: "User not found" }, 400);
  }
};

export const getProfilePost = async (c: any) => {
  const { email } = await c.req.json();
  try {
    const result =
      await sql`select full_name, profile_pic, mist_id, phone from users where email = ${email}`;
    return c.json({ result });
  } catch (error) {
    console.log(error);
    return c.json({ error: "User not found" }, 400);
  }
};

// Public profile by VJudge ID (no auth)
export const getPublicProfileByVjudge = async (c: any) => {
  const vjudge = c.req.param("vjudge");
  if (!vjudge) return c.json({ error: "Missing vjudge id" }, 400);
  try {
    const rows = await sql`
      select id, full_name, profile_pic, email, phone, created_at, vjudge_id, vjudge_verified, cf_id, cf_verified, codechef_id, atcoder_id
      from users
      where vjudge_id = ${vjudge}
      limit 1
    `;
    if (rows.length === 0) return c.json({ error: "Not found" }, 404);
    // Do not expose sensitive fields like password
    const u = rows[0];
    return c.json({
      result: {
        id: u.id,
        full_name: u.full_name,
        profile_pic: u.profile_pic,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        vjudge_id: u.vjudge_id,
        vjudge_verified: u.vjudge_verified,
        cf_id: u.cf_id,
        cf_verified: u.cf_verified,
        codechef_id: u.codechef_id,
        atcoder_id: u.atcoder_id,
      },
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: "Something went wrong" }, 500);
  }
};

// Public list of existing VJudge IDs (no auth)
export const listPublicVjudgeIds = async (c: any) => {
  try {
    const rows =
      await sql`select vjudge_id from users where vjudge_id is not null and vjudge_id <> ''`;
    const ids = rows.map((r: any) => r.vjudge_id);
    return c.json({ result: ids });
  } catch (e) {
    console.error(e);
    return c.json({ error: "Failed" }, 500);
  }
};

export const pendingUser = async (c: any) => {
  try {
    const result = await sql`select * from users where granted = false`;
    return c.json({ result });
  } catch (error) {
    console.log(error);
    return c.json({ error: "error" }, 400);
  }
};

export const rejectUser = async (c: any) => {
  const { userId } = await c.req.json();
  console.log(userId);
  try {
    const result =
      await sql`delete from users where id = ${userId} returning *`;
    console.log(result[0].email);
    await sendEmail(
      result[0].email,
      "Account reject",
      "Your account has been rejected"
    );
    return c.json({ result });
  } catch (error) {
    console.log(error);
    return c.json({ error: "error" }, 400);
  }
};

export const acceptUser = async (c: any) => {
  const { userId } = await c.req.json();
  console.log(userId);
  try {
    const result =
      await sql`update users set granted = true where id = ${userId} returning *`;
    console.log(result[0].email);
    await sendEmail(
      result[0].email,
      "Account granted",
      "Your account is granted. You can now login."
    );
    return c.json({ result });
  } catch (error) {
    console.log(error);
    return c.json({ error: "error" }, 400);
  }
};

// Password Reset Functions
const otpStore = new Map(); // In-memory storage for OTPs (for production, use Redis or database)

export const sendResetOTP = async (c: any) => {
  const { email } = await c.req.json();

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  try {
    // Check if user exists
    const user = await sql`select * from users where email = ${email}`;
    if (user.length === 0) {
      return c.json({ error: "No account found with this email address" }, 400);
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP with expiration (5 minutes)
    const otpData = {
      otp: otp,
      email: email,
      expires: Date.now() + 5 * 60 * 1000, // 5 minutes
      verified: false,
    };
    otpStore.set(email, otpData);

    // Send email
    await sendEmail(
      email,
      "Password Reset OTP - MCC Website",
      `Your OTP for password reset is: ${otp}. This OTP will expire in 5 minutes.`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You have requested to reset your password for MCC Website.</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h3 style="margin: 0; font-size: 24px; color: #333;">Your OTP: ${otp}</h3>
          </div>
          <p>This OTP will expire in 5 minutes.</p>
          <p>If you did not request this password reset, please ignore this email.</p>
        </div>
      `
    );

    return c.json({ message: "OTP sent to your email successfully" });
  } catch (error) {
    console.log(error);
    return c.json({ error: "Failed to send OTP" }, 500);
  }
};

export const verifyOTP = async (c: any) => {
  const { email, otp } = await c.req.json();

  if (!email || !otp) {
    return c.json({ error: "Email and OTP are required" }, 400);
  }

  try {
    const otpData = otpStore.get(email);

    if (!otpData) {
      return c.json(
        { error: "No OTP found for this email. Please request a new OTP." },
        400
      );
    }

    if (Date.now() > otpData.expires) {
      otpStore.delete(email);
      return c.json(
        { error: "OTP has expired. Please request a new OTP." },
        400
      );
    }

    if (otpData.otp !== otp) {
      return c.json({ error: "Invalid OTP" }, 400);
    }

    // Mark OTP as verified
    otpData.verified = true;
    otpStore.set(email, otpData);

    return c.json({ message: "OTP verified successfully" });
  } catch (error) {
    console.log(error);
    return c.json({ error: "Failed to verify OTP" }, 500);
  }
};

export const resetPassword = async (c: any) => {
  const { email, otp, password } = await c.req.json();

  if (!email || !otp || !password) {
    return c.json({ error: "Email, OTP, and password are required" }, 400);
  }

  if (password.length < 8) {
    return c.json(
      { error: "Password must be at least 8 characters long" },
      400
    );
  }

  try {
    const otpData = otpStore.get(email);

    if (!otpData) {
      return c.json(
        { error: "No OTP found for this email. Please request a new OTP." },
        400
      );
    }

    if (Date.now() > otpData.expires) {
      otpStore.delete(email);
      return c.json(
        { error: "OTP has expired. Please request a new OTP." },
        400
      );
    }

    if (otpData.otp !== otp || !otpData.verified) {
      return c.json(
        { error: "OTP not verified. Please verify your OTP first." },
        400
      );
    }

    // Hash new password
    const hash = await Bun.password.hash(password);

    // Update password in database
    await sql`UPDATE users SET password = ${hash} WHERE email = ${email}`;

    // Clean up OTP
    otpStore.delete(email);

    return c.json({ message: "Password reset successfully" });
  } catch (error) {
    console.log(error);
    return c.json({ error: "Failed to reset password" }, 500);
  }
};
