import sql from '../db';

export async function initDb() {
  console.log('⏳ Running database initialization for trainer and classroom features...');
  try {
    // 1. Add trainer column to users
    await sql`
      ALTER TABLE public.users 
      ADD COLUMN IF NOT EXISTS trainer boolean DEFAULT false;
    `;
    console.log('✅ Checked/Added "trainer" column in "users" table.');

    // 2. Create classrooms table
    await sql`
      CREATE TABLE IF NOT EXISTS public.classrooms (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        name character varying NOT NULL,
        description text,
        created_by uuid NOT NULL REFERENCES public.users(id),
        live_url character varying,
        CONSTRAINT classrooms_pkey PRIMARY KEY (id)
      );
    `;
    console.log('✅ Checked/Created "classrooms" table.');

    // 3. Create classroom_students table
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_students (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        CONSTRAINT classroom_students_pkey PRIMARY KEY (id),
        CONSTRAINT classroom_students_unique UNIQUE (classroom_id, student_id)
      );
    `;
    console.log('✅ Checked/Created "classroom_students" table.');

    // 4. Create classes table
    await sql`
      CREATE TABLE IF NOT EXISTS public.classes (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        name character varying NOT NULL,
        scheduled_time timestamp with time zone,
        status character varying NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'started', 'completed'
        started_at timestamp with time zone,
        CONSTRAINT classes_pkey PRIMARY KEY (id)
      );
    `;
    console.log('✅ Checked/Created "classes" table.');

    // 5. Create class_problems table
    await sql`
      CREATE TABLE IF NOT EXISTS public.class_problems (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        platform character varying NOT NULL, -- 'codeforces', 'codechef', 'atcoder', 'custom'
        problem_link character varying NOT NULL,
        problem_id character varying,
        title character varying NOT NULL,
        points character varying,
        difficulty character varying,
        timer_minutes integer,
        status character varying NOT NULL DEFAULT 'not_solved', -- 'not_solved', 'tried', 'solved'
        student_difficulty character varying,
        solved_at timestamp with time zone,
        assigned_at timestamp with time zone NOT NULL DEFAULT now(),
        tags text[] DEFAULT '{}'::text[],
        CONSTRAINT class_problems_pkey PRIMARY KEY (id)
      );
    `;
    await sql`
      ALTER TABLE public.class_problems
      ADD COLUMN IF NOT EXISTS student_difficulty character varying;
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.problem_tag_dictionary (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        name text NOT NULL,
        created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT problem_tag_dictionary_pkey PRIMARY KEY (id),
        CONSTRAINT problem_tag_dictionary_name_unique UNIQUE (name)
      );
    `;
    await sql`
      INSERT INTO public.problem_tag_dictionary (name)
      SELECT DISTINCT lower(trim(tag))
      FROM public.class_problems cp, unnest(cp.tags) AS tag
      WHERE trim(tag) <> ''
      ON CONFLICT (name) DO NOTHING;
    `;
    console.log('✅ Checked/Created "class_problems" table.');

    // 6. Create classroom_resources table
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_resources (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE,
        class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
        title character varying NOT NULL,
        url character varying,
        content text,
        CONSTRAINT classroom_resources_pkey PRIMARY KEY (id)
      );
    `;
    await sql`
      ALTER TABLE public.classroom_resources
      ADD COLUMN IF NOT EXISTS content text;
    `;
    await sql`
      ALTER TABLE public.classroom_resources
      ALTER COLUMN url DROP NOT NULL;
    `;
    console.log('✅ Checked/Created "classroom_resources" table.');

    // 7. Create trainer_teams table
    await sql`
      CREATE TABLE IF NOT EXISTS public.trainer_teams (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        name character varying NOT NULL,
        CONSTRAINT trainer_teams_pkey PRIMARY KEY (id)
      );
    `;
    console.log('✅ Checked/Created "trainer_teams" table.');

    // 8. Create trainer_team_members table
    await sql`
      CREATE TABLE IF NOT EXISTS public.trainer_team_members (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        team_id uuid NOT NULL REFERENCES public.trainer_teams(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        CONSTRAINT trainer_team_members_pkey PRIMARY KEY (id),
        CONSTRAINT trainer_team_members_unique UNIQUE (team_id, student_id)
      );
    `;
    console.log('✅ Checked/Created "trainer_team_members" table.');

    // 9. Create classroom topic library and team-topic assignment tables
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_topics (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        created_by uuid NOT NULL REFERENCES public.users(id),
        title character varying NOT NULL,
        module character varying,
        description text,
        status character varying NOT NULL DEFAULT 'active',
        CONSTRAINT classroom_topics_pkey PRIMARY KEY (id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_topics_classroom_id_idx
      ON public.classroom_topics(classroom_id);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_topic_resources (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        topic_id uuid NOT NULL REFERENCES public.classroom_topics(id) ON DELETE CASCADE,
        title character varying NOT NULL,
        url character varying,
        content text,
        position integer NOT NULL DEFAULT 0,
        CONSTRAINT classroom_topic_resources_pkey PRIMARY KEY (id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_topic_resources_topic_id_idx
      ON public.classroom_topic_resources(topic_id);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_topic_problems (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        topic_id uuid NOT NULL REFERENCES public.classroom_topics(id) ON DELETE CASCADE,
        platform character varying NOT NULL,
        problem_link character varying NOT NULL,
        title character varying NOT NULL,
        details text,
        difficulty character varying,
        timer_minutes integer,
        tags text[] DEFAULT '{}'::text[],
        position integer NOT NULL DEFAULT 0,
        CONSTRAINT classroom_topic_problems_pkey PRIMARY KEY (id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_topic_problems_topic_id_idx
      ON public.classroom_topic_problems(topic_id);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_team_topic_assignments (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        topic_id uuid NOT NULL REFERENCES public.classroom_topics(id) ON DELETE CASCADE,
        team_id uuid NOT NULL REFERENCES public.trainer_teams(id) ON DELETE CASCADE,
        assigned_by uuid NOT NULL REFERENCES public.users(id),
        assigned_at timestamp with time zone NOT NULL DEFAULT now(),
        status character varying NOT NULL DEFAULT 'active',
        CONSTRAINT classroom_team_topic_assignments_pkey PRIMARY KEY (id),
        CONSTRAINT classroom_team_topic_assignments_unique UNIQUE (topic_id, team_id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_team_topic_assignments_classroom_id_idx
      ON public.classroom_team_topic_assignments(classroom_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_team_topic_assignments_team_id_idx
      ON public.classroom_team_topic_assignments(team_id);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_topic_problem_progress (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        assignment_id uuid NOT NULL REFERENCES public.classroom_team_topic_assignments(id) ON DELETE CASCADE,
        topic_problem_id uuid NOT NULL REFERENCES public.classroom_topic_problems(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        status character varying NOT NULL DEFAULT 'not_solved',
        student_difficulty character varying,
        solved_at timestamp with time zone,
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT classroom_topic_problem_progress_pkey PRIMARY KEY (id),
        CONSTRAINT classroom_topic_problem_progress_unique UNIQUE (assignment_id, topic_problem_id, student_id)
      );
    `;
    await sql`
      ALTER TABLE public.classroom_topic_problem_progress
      ADD COLUMN IF NOT EXISTS student_difficulty character varying;
    `;
    await sql`
      ALTER TABLE public.classroom_topic_problem_progress
      ADD COLUMN IF NOT EXISTS solution_link text,
      ADD COLUMN IF NOT EXISTS solution_code text,
      ADD COLUMN IF NOT EXISTS submission_notes text;
    `;
    await sql`
      ALTER TABLE public.class_problems
      ADD COLUMN IF NOT EXISTS solution_link text,
      ADD COLUMN IF NOT EXISTS solution_code text,
      ADD COLUMN IF NOT EXISTS submission_notes text;
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_topic_problem_progress_student_id_idx
      ON public.classroom_topic_problem_progress(student_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_topic_problem_progress_problem_id_idx
      ON public.classroom_topic_problem_progress(topic_problem_id);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_board_sessions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
        room_id character varying NOT NULL,
        started_by uuid NOT NULL REFERENCES public.users(id),
        started_at timestamp with time zone NOT NULL DEFAULT now(),
        ended_at timestamp with time zone,
        status character varying NOT NULL DEFAULT 'active',
        CONSTRAINT classroom_board_sessions_pkey PRIMARY KEY (id),
        CONSTRAINT classroom_board_sessions_room_id_unique UNIQUE (room_id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_board_sessions_classroom_id_idx
      ON public.classroom_board_sessions(classroom_id);
    `;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS classroom_board_sessions_active_classroom_idx
      ON public.classroom_board_sessions(classroom_id)
      WHERE status = 'active';
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_ide_sessions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
        student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        language character varying NOT NULL DEFAULT 'javascript',
        code text NOT NULL DEFAULT '',
        focused boolean NOT NULL DEFAULT true,
        code_length integer NOT NULL DEFAULT 0,
        paste_count integer NOT NULL DEFAULT 0,
        large_insert_count integer NOT NULL DEFAULT 0,
        last_event_type character varying,
        last_event_at timestamp with time zone,
        CONSTRAINT classroom_ide_sessions_pkey PRIMARY KEY (id),
        CONSTRAINT classroom_ide_sessions_unique_student UNIQUE (classroom_id, student_id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_ide_sessions_classroom_id_idx
      ON public.classroom_ide_sessions(classroom_id);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_ide_sessions_student_id_idx
      ON public.classroom_ide_sessions(student_id);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_ide_events (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        session_id uuid NOT NULL REFERENCES public.classroom_ide_sessions(id) ON DELETE CASCADE,
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        event_type character varying NOT NULL,
        event_detail jsonb NOT NULL DEFAULT '{}'::jsonb,
        language character varying NOT NULL DEFAULT 'javascript',
        code_length integer NOT NULL DEFAULT 0,
        focused boolean NOT NULL DEFAULT true,
        CONSTRAINT classroom_ide_events_pkey PRIMARY KEY (id)
      );
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_ide_events_classroom_created_idx
      ON public.classroom_ide_events(classroom_id, created_at DESC);
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_ide_events_student_created_idx
      ON public.classroom_ide_events(student_id, created_at DESC);
    `;
    console.log('Checked/Created classroom topic, assignment, board, and IDE tables.');

    // 10. Create class_problem_hints table
    await sql`
      CREATE TABLE IF NOT EXISTS public.class_problem_hints (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        problem_id uuid NOT NULL REFERENCES public.class_problems(id) ON DELETE CASCADE,
        hint_text text NOT NULL,
        unlock_after_seconds integer DEFAULT 0,
        CONSTRAINT class_problem_hints_pkey PRIMARY KEY (id)
      );
    `;
    console.log('✅ Checked/Created "class_problem_hints" table.');

    // 11. Create class_problem_notes table
    await sql`
      CREATE TABLE IF NOT EXISTS public.class_problem_notes (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        problem_id uuid NOT NULL REFERENCES public.class_problems(id) ON DELETE CASCADE,
        note_text text NOT NULL,
        created_by uuid NOT NULL REFERENCES public.users(id),
        CONSTRAINT class_problem_notes_pkey PRIMARY KEY (id)
      );
    `;
    console.log('✅ Checked/Created "class_problem_notes" table.');

    // 12. Create classroom_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_messages (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
        sender_id uuid NOT NULL REFERENCES public.users(id),
        recipient_id uuid REFERENCES public.users(id),
        message text NOT NULL,
        CONSTRAINT classroom_messages_pkey PRIMARY KEY (id)
      );
    `;
    await sql`
      ALTER TABLE public.classroom_messages
      ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS classroom_messages_class_id_idx
      ON public.classroom_messages(class_id);
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_message_reactions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        message_id uuid NOT NULL REFERENCES public.classroom_messages(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        reaction text NOT NULL,
        CONSTRAINT classroom_message_reactions_pkey PRIMARY KEY (id),
        CONSTRAINT classroom_message_reactions_unique UNIQUE (message_id, user_id, reaction)
      );
    `;
    console.log('✅ Checked/Created "classroom_messages" table.');

    // 13. Create in_app_notifications table
    await sql`
      CREATE TABLE IF NOT EXISTS public.in_app_notifications (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        title character varying NOT NULL,
        message text NOT NULL,
        read boolean NOT NULL DEFAULT false,
        link character varying,
        CONSTRAINT in_app_notifications_pkey PRIMARY KEY (id)
      );
    `;
    console.log('✅ Checked/Created "in_app_notifications" table.');

    console.log('🎉 Database initialization complete!');
    // 14. Create trainer_forms table
    await sql`
      CREATE TABLE IF NOT EXISTS public.trainer_forms (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        title character varying NOT NULL,
        description text,
        type character varying NOT NULL DEFAULT 'general',
        share_slug character varying NOT NULL UNIQUE,
        status character varying NOT NULL DEFAULT 'published',
        primary_key_field character varying NOT NULL DEFAULT 'mist_id',
        primary_key_label character varying NOT NULL DEFAULT 'Student ID',
        classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
        class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
        fields jsonb NOT NULL DEFAULT '[]'::jsonb,
        settings jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT trainer_forms_pkey PRIMARY KEY (id),
        CONSTRAINT trainer_forms_type_check CHECK (type IN ('classroom_invitation', 'attendance', 'general')),
        CONSTRAINT trainer_forms_status_check CHECK (status IN ('draft', 'published'))
      );
    `;
    console.log('Checked/Created "trainer_forms" table.');

    // 15. Create trainer_form_responses table
    await sql`
      CREATE TABLE IF NOT EXISTS public.trainer_form_responses (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        submitted_at timestamp with time zone NOT NULL DEFAULT now(),
        form_id uuid NOT NULL REFERENCES public.trainer_forms(id) ON DELETE CASCADE,
        matched_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
        primary_key_value text NOT NULL,
        response_json jsonb NOT NULL DEFAULT '{}'::jsonb,
        raw_answers jsonb NOT NULL DEFAULT '{}'::jsonb,
        user_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
        submission_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
        CONSTRAINT trainer_form_responses_pkey PRIMARY KEY (id),
        CONSTRAINT trainer_form_responses_unique_user UNIQUE (form_id, primary_key_value)
      );
    `;
    console.log('Checked/Created "trainer_form_responses" table.');

    await sql`
      CREATE INDEX IF NOT EXISTS trainer_forms_created_by_idx
      ON public.trainer_forms(created_by);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS trainer_forms_type_idx
      ON public.trainer_forms(type);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS trainer_form_responses_form_id_idx
      ON public.trainer_form_responses(form_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS trainer_form_responses_matched_user_idx
      ON public.trainer_form_responses(matched_user_id);
    `;

    // 16. Schema extensions & Attendance table
    await sql`
      ALTER TABLE public.trainer_forms
      ADD COLUMN IF NOT EXISTS accepting_responses boolean DEFAULT true;
    `;

    await sql`
      ALTER TABLE public.classes
      ADD COLUMN IF NOT EXISTS session_type text DEFAULT 'onsite',
      ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 90,
      ADD COLUMN IF NOT EXISTS overflow_minutes integer DEFAULT 0;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS public.class_attendance (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
        student_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'present',
        recorded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
        trainer_name text,
        remarks text,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT class_attendance_pkey PRIMARY KEY (id),
        CONSTRAINT class_attendance_unique_class_student UNIQUE (class_id, student_id),
        CONSTRAINT class_attendance_status_check CHECK (status IN ('present', 'absent', 'late', 'very_late', 'excused'))
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS class_attendance_class_idx
      ON public.class_attendance(class_id);
    `;

    // 17. Trainer profile columns
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainer_title text;`;
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainer_bio text;`;
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainer_experience text;`;
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainer_specializations text[] DEFAULT '{}'::text[];`;
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainer_linkedin text;`;
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainer_github text;`;
    await sql`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainer_website text;`;
    console.log('✅ Checked/Added trainer profile columns to "users" table.');

    // 18. Case-insensitive expression indexes on users for high-performance form submissions & matching
    await sql`CREATE INDEX IF NOT EXISTS users_lower_email_idx ON public.users (lower(email));`;
    await sql`CREATE INDEX IF NOT EXISTS users_lower_vjudge_idx ON public.users (lower(vjudge_id)) WHERE vjudge_id IS NOT NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS users_lower_cf_idx ON public.users (lower(cf_id)) WHERE cf_id IS NOT NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS users_lower_codechef_idx ON public.users (lower(codechef_id)) WHERE codechef_id IS NOT NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS users_lower_atcoder_idx ON public.users (lower(atcoder_id)) WHERE atcoder_id IS NOT NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS users_lower_batch_idx ON public.users (lower(batch_name)) WHERE batch_name IS NOT NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS users_mist_id_idx ON public.users (mist_id) WHERE mist_id IS NOT NULL;`;
    await sql`CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users (phone) WHERE phone IS NOT NULL;`;
    console.log('✅ Checked/Created performance indexes on "users" table.');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}
