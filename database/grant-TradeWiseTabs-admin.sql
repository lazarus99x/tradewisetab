 -- Find the actual Auth UUID and set role = admin
    DO $$
    DECLARE
      v_user_id UUID;
    BEGIN
      -- Get the user's actual Supabase Auth UUID
      SELECT id INTO v_user_id
      FROM auth.users
      WHERE email = 'lazarus99x@gmail.com';

      IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users. Create them in Supabase Auth first via sign-up.';
      END IF;

      -- Upsert profile with the CORRECT Auth UUID
      INSERT INTO public.profiles (user_id, email, role, full_name)
      VALUES (v_user_id::text, 'lazarus99x@gmail.com', 'admin', 'Super Admin')
      ON CONFLICT (user_id) DO UPDATE
      SET role = 'admin', email = 'lazarus99x@gmail.com';

      RAISE NOTICE 'Admin role granted to user_id: %', v_user_id;
    END $$;

    -- Verify
    SELECT user_id, email, role, full_name
    FROM public.profiles
    WHERE email = 'lazarus99x@gmail.com';