-- SCRIPT DE CONFIGURAÇÃO COMPLETO DO WANDERPET (SUPABASE)
-- Versão atualizada: 24/04/2026
-- Copie e cole este script no SQL Editor do seu projeto Supabase e clique em 'RUN'.

-- 1. Tabela de Perfis (Extensão do Auth)
-- Nota: Esta tabela geralmente é criada via Trigger, mas garantimos os campos extras aqui
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS battery_saver BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT; -- Ex: "Curitiba, BR"
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS claimed_quests TEXT[] DEFAULT '{}';

-- Garante a unicidade absoluta do Wander-ID
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_wander_id') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT unique_wander_id UNIQUE (wander_id);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_profiles_wander_id ON public.profiles(wander_id);

-- 2. Tabela de Amizades
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id1 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id2 UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id1, user_id2)
);
CREATE INDEX IF NOT EXISTS idx_friendships_users ON public.friendships(user_id1, user_id2);

-- 3. Tabela de Mensagens (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Caso a tabela já exista com o nome de coluna antigo 'receiver_id', renomeamos
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='receiver_id') THEN
        ALTER TABLE public.messages RENAME COLUMN receiver_id TO recipient_id;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(sender_id, recipient_id);

-- 4. Tabela de Likes Sociais
CREATE TABLE IF NOT EXISTS public.social_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_id)
);

-- 5. Tabela de Clãs (Grupos)
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    founder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    password TEXT,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, user_id)
);

-- 6. Tabela de Pets
CREATE TABLE IF NOT EXISTS public.pets (
    owner_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    accessory TEXT DEFAULT 'none',
    custom_image_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Localizações (Tempo Real)
CREATE TABLE IF NOT EXISTS public.locations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    ghost_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Expedições
CREATE TABLE IF NOT EXISTS public.expeditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    distance FLOAT NOT NULL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    path JSONB DEFAULT '[]'::jsonb,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Recomendações
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(recommender_id, recommended_id)
);

-- HABILITAR REALTIME
-- Nota: Pode ser necessário recriar a publicação se já existir
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.locations, 
    public.messages, 
    public.friendships,
    public.profiles;

-- CONFIGURAÇÃO DE STORAGE (Bucket de Avatares)
-- Certifique-se de criar o bucket 'avatars' manualmente como PUBLIC no dashboard.
-- Políticas de acesso:
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Public Access') THEN
        CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatars') THEN
        CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;
END $$;
