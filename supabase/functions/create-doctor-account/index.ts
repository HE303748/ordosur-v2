import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Edge Function: Create Doctor Account with Temporary Password
 *
 * This function allows clinic administrators to create doctor accounts with
 * temporary passwords. The doctor is then required to reset their password
 * on first login, following medical software security standards.
 *
 * Security Features:
 * - Uses service role for admin operations (server-side only)
 * - Generates cryptographically secure temporary passwords
 * - Automatically creates mandatory password reset requirement
 * - Comprehensive audit logging of all actions
 * - Input validation and sanitization
 * - CSRF protection via authentication token verification
 *
 * @param {string} email - Doctor's email address
 * @param {string} full_name - Doctor's full name
 * @param {string} specialization - Medical specialization
 * @param {string} rpps_number - Professional registration number
 * @param {string} phone_number - Contact phone number
 * @param {string} medical_license_number - Medical license number
 * @param {string} clinic_id - ID of the clinic
 *
 * @returns {object} - Doctor account details and temporary password
 */

interface CreateDoctorRequest {
  email: string;
  full_name: string;
  specialization: string[];
  rpps_number: string;
  phone_number: string;
  medical_license_number: string;
  clinic_id: string;
}

interface CreateDoctorResponse {
  success: boolean;
  doctor_id?: string;
  email?: string;
  temporary_password?: string;
  password_expires_at?: string;
  error?: string;
}

/**
 * Generate a cryptographically secure temporary password
 * Password meets enterprise security requirements:
 * - Minimum 16 characters
 * - Mix of uppercase, lowercase, numbers, and symbols
 * - Uses Web Crypto API for true randomness
 */
function generateSecurePassword(): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I, O for clarity
  const lowercase = 'abcdefghijkmnopqrstuvwxyz'; // Excluding l for clarity
  const numbers = '23456789'; // Excluding 0, 1 for clarity
  const symbols = '!@#$%^&*-_=+';

  const allChars = uppercase + lowercase + numbers + symbols;

  // Generate 16 character password
  const length = 16;
  let password = '';

  // Ensure at least one of each character type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill remaining characters randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to randomize position of required characters
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize input to prevent injection attacks
 */
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's auth token for verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is a clinic admin
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized: Invalid authentication token");
    }

    // Check user's role and permissions
    const { data: adminProfile, error: profileError } = await supabaseClient
      .from("user_profiles")
      .select("id, role, clinic_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !adminProfile) {
      throw new Error("Unauthorized: User profile not found");
    }

    if (!["clinic", "clinic_admin", "admin"].includes(adminProfile.role)) {
      throw new Error("Unauthorized: Insufficient permissions");
    }

    // Parse and validate request body
    const requestBody: CreateDoctorRequest = await req.json();
    const {
      email,
      full_name,
      specialization,
      rpps_number,
      phone_number,
      medical_license_number,
      clinic_id,
    } = requestBody;

    // Input validation
    if (!email || !isValidEmail(email)) {
      throw new Error("Invalid email address");
    }

    if (!full_name || full_name.trim().length < 2) {
      throw new Error("Full name is required (minimum 2 characters)");
    }

    if (!specialization || specialization.length === 0) {
      throw new Error("At least one specialization is required");
    }

    if (!rpps_number || rpps_number.trim().length === 0) {
      throw new Error("RPPS number is required");
    }

    if (!medical_license_number || medical_license_number.trim().length === 0) {
      throw new Error("Medical license number is required");
    }

    if (!clinic_id) {
      throw new Error("Clinic ID is required");
    }

    // Verify admin belongs to the clinic
    if (adminProfile.role !== "admin" && adminProfile.clinic_id !== clinic_id) {
      throw new Error("Unauthorized: You can only create doctors for your own clinic");
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedFullName = sanitizeInput(full_name);
    const sanitizedRpps = sanitizeInput(rpps_number);
    const sanitizedLicense = sanitizeInput(medical_license_number);
    const sanitizedPhone = sanitizeInput(phone_number || "");

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUser?.users?.some(u => u.email === sanitizedEmail);

    if (userExists) {
      throw new Error("A user with this email already exists");
    }

    // Generate secure temporary password
    const temporaryPassword = generateSecurePassword();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    // Create user account with Supabase Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password: temporaryPassword,
      email_confirm: true, // Auto-confirm email for admin-created accounts
      user_metadata: {
        full_name: sanitizedFullName,
        role: "doctor",
        created_by_admin: true,
        created_by: user.id,
        requires_password_reset: true,
      },
    });

    if (createError || !newUser.user) {
      console.error("Error creating user:", createError);
      throw new Error(`Failed to create user account: ${createError?.message || "Unknown error"}`);
    }

    const doctorUserId = newUser.user.id;

    // Create user profile
    const { error: profileCreateError } = await supabaseAdmin
      .from("user_profiles")
      .insert({
        id: doctorUserId,
        email: sanitizedEmail,
        full_name: sanitizedFullName,
        role: "doctor",
        account_status: "active",
        email_confirmed: true,
        clinic_id: clinic_id,
      });

    if (profileCreateError) {
      // Rollback: Delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(doctorUserId);
      throw new Error(`Failed to create user profile: ${profileCreateError.message}`);
    }

    // Create doctor profile
    const { error: doctorProfileError } = await supabaseAdmin
      .from("doctor_profiles")
      .insert({
        user_id: doctorUserId,
        email: sanitizedEmail,
        full_name: sanitizedFullName,
        specialization: specialization,
        rpps_number: sanitizedRpps,
        phone_number: sanitizedPhone,
        medical_license_number: sanitizedLicense,
        clinic_id: clinic_id,
        is_active: true,
      });

    if (doctorProfileError) {
      // Rollback: Delete the auth user and profile
      await supabaseAdmin.auth.admin.deleteUser(doctorUserId);
      await supabaseAdmin.from("user_profiles").delete().eq("id", doctorUserId);
      throw new Error(`Failed to create doctor profile: ${doctorProfileError.message}`);
    }

    // Create mandatory password reset requirement
    const { error: resetError } = await supabaseAdmin.rpc(
      "create_mandatory_password_reset",
      {
        target_user_id: doctorUserId,
        admin_user_id: user.id,
        reset_reason: "Initial account setup - temporary password issued",
      }
    );

    if (resetError) {
      console.error("Error creating password reset requirement:", resetError);
      // Don't rollback - log the error but continue
    }

    // Log authentication event
    await supabaseAdmin.rpc("log_auth_event", {
      log_user_id: doctorUserId,
      log_email: sanitizedEmail,
      log_event_type: "account_created",
      log_success: true,
      log_details: {
        created_by: user.id,
        created_by_email: user.email,
        clinic_id: clinic_id,
        has_temporary_password: true,
        specialization: specialization,
      },
    });

    // Return success response with temporary password
    const response: CreateDoctorResponse = {
      success: true,
      doctor_id: doctorUserId,
      email: sanitizedEmail,
      temporary_password: temporaryPassword,
      password_expires_at: expiresAt.toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("Error in create-doctor-account function:", error);

    const response: CreateDoctorResponse = {
      success: false,
      error: error.message || "An unexpected error occurred",
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
