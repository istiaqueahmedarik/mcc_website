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
  console.log(email);
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
  select id, full_name, profile_pic, email, phone, created_at, vjudge_id, vjudge_verified, cf_id, cf_verified, codechef_id, atcoder_id, tshirt_size, mist_id_card, mist_id
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
        tshirt_size: u.tshirt_size,
        mist_id_card: u.mist_id_card,
        mist_id: u.mist_id,
      }
    })
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
      "MIST Computer Club - Account Registration Status",
      `Dear ${result[0].full_name},

We appreciate your interest in joining the MIST Computer Club community.

After careful review of your application, we regret to inform you that we are unable to approve your account registration at this time. This decision may be due to incomplete information or verification requirements not being met.

If you believe this is an error or would like to reapply, please feel free to contact us or submit a new registration with complete and accurate information.

Thank you for your understanding.

Best regards,
MIST Computer Club
Military Institute of Science and Technology`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 24px;">MIST Computer Club</h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Military Institute of Science and Technology</p>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">Account Registration Status</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">Dear <strong>${result[0].full_name}</strong>,</p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              We appreciate your interest in joining the MIST Computer Club community.
            </p>
            
            <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #dc2626; margin: 0; font-weight: 500;">
                After careful review of your application, we regret to inform you that we are unable to approve your account registration at this time.
              </p>
            </div>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              This decision may be due to incomplete information or verification requirements not being met.
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              If you believe this is an error or would like to reapply, please feel free to contact us or submit a new registration with complete and accurate information.
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 5px;">Thank you for your understanding.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
              <p style="color: #333; margin: 0; font-weight: 500;">Best regards,</p>
              <p style="color: #2563eb; margin: 5px 0 0 0; font-weight: 600;">MIST Computer Club</p>
              <p style="color: #666; margin: 0; font-size: 14px;">Military Institute of Science and Technology</p>
            </div>
          </div>
        </div>
      `
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
      "MIST Computer Club - Welcome! Account Approved",
      `Dear ${result[0].full_name},

Congratulations and welcome to the MIST Computer Club!

We are pleased to inform you that your account registration has been successfully approved. You are now an official member of our programming community.

You can now access your account and start participating in our activities:
• Programming contests and competitions
• Technical workshops and seminars
• Collaborative projects
• Knowledge sharing sessions
• Networking opportunities with fellow programmers

To get started, please log in to your account using your registered email and password at our website.

We look forward to your active participation and contribution to our vibrant community.

Welcome aboard!

Best regards,
MIST Computer Club
Military Institute of Science and Technology`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 24px;">MIST Computer Club</h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Military Institute of Science and Technology</p>
            </div>
            
            <h2 style="color: #16a34a; margin-bottom: 20px;">🎉 Welcome! Account Approved</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">Dear <strong>${result[0].full_name}</strong>,</p>
            
            <div style="background-color: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #15803d; margin: 0; font-weight: 500;">
                Congratulations! Your account registration has been successfully approved. Welcome to the MIST Computer Club!
              </p>
            </div>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              You are now an official member of our programming community and can access all club features and activities.
            </p>
            
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #2563eb; margin: 0 0 15px 0; font-size: 18px;">What you can do now:</h3>
              <ul style="color: #333; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Participate in programming contests and competitions</li>
                <li style="margin-bottom: 8px;">Attend technical workshops and seminars</li>
                <li style="margin-bottom: 8px;">Join collaborative projects</li>
                <li style="margin-bottom: 8px;">Participate in knowledge sharing sessions</li>
                <li style="margin-bottom: 8px;">Network with fellow programmers</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 25px 0;">
              <div style="background-color: #2563eb; color: white; padding: 15px 25px; border-radius: 8px; display: inline-block;">
                <p style="margin: 0; font-weight: 500;">Ready to get started? Log in to your account now!</p>
              </div>
            </div>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              We look forward to your active participation and contribution to our vibrant community.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
              <p style="color: #333; margin: 0; font-weight: 500;">Welcome aboard!</p>
              <p style="color: #333; margin: 10px 0 5px 0; font-weight: 500;">Best regards,</p>
              <p style="color: #2563eb; margin: 5px 0 0 0; font-weight: 600;">MIST Computer Club</p>
              <p style="color: #666; margin: 0; font-size: 14px;">Military Institute of Science and Technology</p>
            </div>
          </div>
        </div>
      `
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
      "MIST Computer Club - Password Reset Verification Code",
      `Dear User,

You have requested to reset your password for your MIST Computer Club account. 

Your verification code is: ${otp}

This code will expire in 5 minutes for security reasons. Please use it immediately to reset your password.

If you did not request this password reset, please ignore this email and your account will remain secure.

For any assistance, please contact the MIST Computer Club support team.

Best regards,
MIST Computer Club
Military Institute of Science and Technology`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin: 0; font-size: 24px;">MIST Computer Club</h1>
              <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Military Institute of Science and Technology</p>
            </div>
            
            <h2 style="color: #333; margin-bottom: 20px;">🔒 Password Reset Request</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">Dear User,</p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              You have requested to reset your password for your MIST Computer Club account.
            </p>
            
            <div style="background-color: #dbeafe; border: 2px solid #2563eb; padding: 25px; text-align: center; margin: 30px 0; border-radius: 10px;">
              <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1e40af;">Your Verification Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 4px; font-family: 'Courier New', monospace;">${otp}</div>
            </div>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p style="color: #d97706; margin: 0; font-weight: 500;">
                ⏰ This code will expire in 5 minutes for security reasons. Please use it immediately to reset your password.
              </p>
            </div>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
              If you did not request this password reset, please ignore this email and your account will remain secure.
            </p>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
              For any assistance, please contact the MIST Computer Club support team.
            </p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5;">
              <p style="color: #333; margin: 0; font-weight: 500;">Best regards,</p>
              <p style="color: #2563eb; margin: 5px 0 0 0; font-weight: 600;">MIST Computer Club</p>
              <p style="color: #666; margin: 0; font-size: 14px;">Military Institute of Science and Technology</p>
            </div>
          </div>
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
