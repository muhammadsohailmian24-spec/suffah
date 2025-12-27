import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;

    // Find classes starting in the next 10 minutes
    const targetMinute = currentMinute + 10;
    const targetHour = targetMinute >= 60 ? currentHour + 1 : currentHour;
    const adjustedMinute = targetMinute % 60;
    const targetTime = `${String(targetHour).padStart(2, '0')}:${String(adjustedMinute).padStart(2, '0')}`;

    console.log(`Checking for classes on ${DAYS[currentDay]} starting around ${targetTime}`);

    // Get timetable entries for current day starting soon
    const { data: upcomingClasses, error: timetableError } = await supabase
      .from("timetable")
      .select(`
        id,
        start_time,
        room_number,
        teacher_id,
        classes(name),
        subjects(name),
        teachers(user_id)
      `)
      .eq("day_of_week", currentDay)
      .gte("start_time", currentTime)
      .lte("start_time", targetTime);

    if (timetableError) {
      console.error("Error fetching timetable:", timetableError);
      throw timetableError;
    }

    console.log(`Found ${upcomingClasses?.length || 0} upcoming classes`);

    const notifications: any[] = [];

    for (const classEntry of upcomingClasses || []) {
      const teacherUserId = (classEntry.teachers as any)?.user_id;
      if (!teacherUserId) continue;

      const className = (classEntry.classes as any)?.name || "Unknown Class";
      const subjectName = (classEntry.subjects as any)?.name || "Unknown Subject";
      const roomInfo = classEntry.room_number ? ` in Room ${classEntry.room_number}` : "";

      notifications.push({
        user_id: teacherUserId,
        title: "Class Starting Soon",
        message: `Your ${subjectName} class for ${className} starts at ${classEntry.start_time}${roomInfo}`,
        type: "class_reminder",
        link: "/teacher/timetable",
      });
    }

    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }
    }

    console.log(`Created ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notificationsSent: notifications.length,
        checkedTime: currentTime,
        targetTime: targetTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-class-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
