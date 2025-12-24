import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "new_assignment" | "results_published";
  classId: string;
  title: string;
  details: string;
}

async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log("Twilio not configured, skipping SMS");
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER,
        Body: message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`SMS failed to ${to}:`, error);
      return false;
    }

    console.log(`SMS sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`SMS error to ${to}:`, error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, classId, title, details }: NotificationRequest = await req.json();

    console.log(`Processing ${type} notification for class ${classId}`);

    // Get students in the class
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, user_id")
      .eq("class_id", classId);

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      throw studentsError;
    }

    const studentUserIds = students?.map((s: any) => s.user_id) || [];
    const studentIds = students?.map((s: any) => s.id) || [];
    
    if (studentUserIds.length === 0) {
      console.log("No students found in class");
      return new Response(
        JSON.stringify({ message: "No students to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get student profiles for emails
    const { data: profiles } = await supabase
      .from("profiles")
      .select("email, full_name")
      .in("user_id", studentUserIds);

    // Get parent info
    const { data: studentParents } = await supabase
      .from("student_parents")
      .select("parent_id")
      .in("student_id", studentIds);

    let parentEmails: string[] = [];
    let parentPhones: { phone: string; name: string }[] = [];

    if (studentParents && studentParents.length > 0) {
      const parentIds = [...new Set(studentParents.map((sp: any) => sp.parent_id))];
      
      const { data: parents } = await supabase
        .from("parents")
        .select("user_id")
        .in("id", parentIds);
      
      if (parents && parents.length > 0) {
        const parentUserIds = parents.map((p: any) => p.user_id);
        
        const { data: parentProfiles } = await supabase
          .from("profiles")
          .select("email, phone, full_name, sms_notifications_enabled")
          .in("user_id", parentUserIds);
        
        if (parentProfiles) {
          parentEmails = parentProfiles.map((p: any) => p.email);
          // Get parents who have SMS enabled and have a phone number
          parentPhones = parentProfiles
            .filter((p: any) => p.sms_notifications_enabled && p.phone)
            .map((p: any) => ({ phone: p.phone, name: p.full_name }));
        }
      }
    }

    const studentEmails = profiles?.map((p: any) => p.email) || [];
    const allEmails = [...new Set([...studentEmails, ...parentEmails])];

    const subject = type === "new_assignment" 
      ? `New Assignment: ${title}`
      : `Results Published: ${title}`;

    const htmlContent = type === "new_assignment"
      ? `
        <h1>📚 New Assignment Posted</h1>
        <h2>${title}</h2>
        <p>${details}</p>
        <p>Please log in to the school portal to view the assignment details and submit your work.</p>
        <p>Best regards,<br>School Management System</p>
      `
      : `
        <h1>📊 Exam Results Published</h1>
        <h2>${title}</h2>
        <p>${details}</p>
        <p>Please log in to the school portal to view your results.</p>
        <p>Best regards,<br>School Management System</p>
      `;

    let emailsSent = 0;
    let smsSent = 0;

    // Send emails
    if (allEmails.length > 0) {
      try {
        await resend.emails.send({
          from: "School Notifications <onboarding@resend.dev>",
          to: allEmails,
          subject: subject,
          html: htmlContent,
        });
        emailsSent = allEmails.length;
        console.log(`Emails sent to ${emailsSent} recipients`);
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
    }

    // Send SMS to parents who opted in
    const smsMessage = type === "new_assignment"
      ? `📚 New Assignment: "${title}" has been posted. Due: ${details.split("Due date:")[1] || "Check portal"}. Log in to view details.`
      : `📊 Results Published: "${title}". Log in to the school portal to view grades.`;

    for (const parent of parentPhones) {
      const sent = await sendSMS(parent.phone, smsMessage);
      if (sent) smsSent++;
    }

    // Create in-app notifications
    const notifications = studentUserIds.map((userId: string) => ({
      user_id: userId,
      title: subject,
      message: details,
      type: type === "new_assignment" ? "assignment" : "result",
      link: type === "new_assignment" ? "/student/assignments" : "/student/results",
    }));

    const { error: notifError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notifError) {
      console.error("Error creating notifications:", notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        smsSent,
        message: `Sent ${emailsSent} emails and ${smsSent} SMS notifications`
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
