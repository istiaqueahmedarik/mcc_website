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
        solved_at timestamp with time zone,
        assigned_at timestamp with time zone NOT NULL DEFAULT now(),
        tags text[] DEFAULT '{}'::text[],
        CONSTRAINT class_problems_pkey PRIMARY KEY (id)
      );
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
        url character varying NOT NULL,
        CONSTRAINT classroom_resources_pkey PRIMARY KEY (id)
      );
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

    // 9. Create class_problem_hints table
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

    // 10. Create class_problem_notes table
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

    // 11. Create classroom_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS public.classroom_messages (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        classroom_id uuid NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
        sender_id uuid NOT NULL REFERENCES public.users(id),
        recipient_id uuid REFERENCES public.users(id),
        message text NOT NULL,
        CONSTRAINT classroom_messages_pkey PRIMARY KEY (id)
      );
    `;
    console.log('✅ Checked/Created "classroom_messages" table.');

    // 12. Create in_app_notifications table
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
    // 13. Create trainer_forms table
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

    // 14. Create trainer_form_responses table
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

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}
