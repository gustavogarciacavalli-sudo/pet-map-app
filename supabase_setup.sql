-- SCRIPT DE CONFIGURAÇÃO DO WANDERPET (SUPABASE)
-- Copie e cole este script no SQL Editor do seu projeto Supabase e clique em 'RUN'.

-- 1. Tabela de Expedições (Histórico de Caminhadas)
CREATE TABLE IF NOT EXISTS public.expeditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    distance FLOAT NOT NULL DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    path JSONB DEFAULT '[]'::jsonb,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indice para buscas por data
CREATE INDEX IF NOT EXISTS idx_expeditions_user_date ON public.expeditions(user_id, date);

-- 2. Tabela de Localizações (Mapa em Tempo Real)
CREATE TABLE IF NOT EXISTS public.locations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    ghost_mode BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Likes Sociais
CREATE TABLE IF NOT EXISTS public.social_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    target_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, target_id)
);

-- 4. Tabela de Mensagens (Chat)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Recomendações Sociais
CREATE TABLE IF NOT EXISTS public.recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    recommended_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(recommender_id, recommended_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_users ON public.recommendations(recommender_id, recommended_id);

-- HABILITAR REALTIME (Opcional, mas recomendado para o mapa e chat)
-- Execute estas linhas se quiser habilitar o broadcast nativo nessas tabelas
-- ALTER PUBLICATION supabase_realtime ADD TABLE locations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- 5. Atualização da Tabela de Perfis (Campos Adicionais)
-- Execute estas linhas para garantir que os campos de configuração existam
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ghost_mode BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS battery_saver BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar TEXT;

-- 6. Configuração de Storage (Balde de Avatares)
-- A criação de buckets via SQL é restrita no Supabase Dashboard por segurança.
-- RECOMENDAÇÃO: Crie manualmente o bucket 'avatars' como PUBLIC no Dashboard do Supabase.
-- Se preferir tentar via SQL Editor (PODE EXIGIR PERMISSÕES EXTRAS):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Políticas de Segurança para o bucket 'avatars'
-- IMPORTANTE: Certifique-se de que o bucket se chama 'avatars' em minúsculo.

-- Permite acesso público para leitura das fotos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Public Access') THEN
        CREATE POLICY "Avatar Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;
END $$;

-- Permite que usuários autenticados façam upload de suas próprias fotos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatars') THEN
        CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
    END IF;
END $$;

-- Permite que usuários atualizem suas próprias fotos
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatars') THEN
        CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);
    END IF;
END $$;

