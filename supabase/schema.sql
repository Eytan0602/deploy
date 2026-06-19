-- Base de datos del Portal PNP (Supabase PostgreSQL)

-- 1. Tabla de Usuarios (Perfiles de usuario vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    dni VARCHAR(8) UNIQUE NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en usuarios
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública de perfiles" 
ON public.usuarios FOR SELECT 
USING (true);

CREATE POLICY "Permitir a los usuarios actualizar su propio perfil" 
ON public.usuarios FOR UPDATE 
USING (auth.uid() = id);

-- Trigger para crear perfil automáticamente al registrarse en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.usuarios (id, dni, nombre_completo, email, telefono)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'dni', ''),
    COALESCE(new.raw_user_meta_data->>'nombre_completo', ''),
    new.email,
    COALESCE(new.raw_user_meta_data->>'telefono', '')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Tabla de Solicitudes DNI (RENIEC / DNI Validado)
CREATE TABLE IF NOT EXISTS public.solicitudes_dni (
    dni VARCHAR(8) PRIMARY KEY,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    genero VARCHAR(10),
    direccion VARCHAR(250),
    ubigeo VARCHAR(6),
    distrito VARCHAR(100),
    provincia VARCHAR(100),
    departamento VARCHAR(100),
    foto_dni TEXT, -- Base64 String
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.solicitudes_dni ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select/insert a cualquiera" ON public.solicitudes_dni FOR ALL USING (true);


-- 3. Tabla de Licencias de Conducir (MTC)
CREATE TABLE IF NOT EXISTS public.licencias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dni VARCHAR(8) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    numero_licencia VARCHAR(20) UNIQUE NOT NULL,
    categoria VARCHAR(10) NOT NULL,
    fecha_expedicion DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'ACTIVA' NOT NULL,
    restricciones VARCHAR(200),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select/insert a cualquiera" ON public.licencias FOR ALL USING (true);


-- 4. Tabla de Vehículos (SUNARP)
CREATE TABLE IF NOT EXISTS public.vehiculos (
    placa VARCHAR(10) PRIMARY KEY,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INTEGER,
    color VARCHAR(30),
    motor VARCHAR(50) NOT NULL,
    serie VARCHAR(50) NOT NULL,
    vin VARCHAR(17) UNIQUE,
    foto_verificacion TEXT, -- Base64 String
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vehiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select/insert a cualquiera" ON public.vehiculos FOR ALL USING (true);


-- 5. Tabla de SOAT
CREATE TABLE IF NOT EXISTS public.soat (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    placa VARCHAR(10) UNIQUE NOT NULL,
    compania VARCHAR(100) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'VIGENTE' NOT NULL,
    num_poliza VARCHAR(30) UNIQUE NOT NULL,
    codigo_sbs VARCHAR(4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.soat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir select/insert a cualquiera" ON public.soat FOR ALL USING (true);


-- 6. Tabla de Permisos de Lunas Polarizadas (Trámite Consolidado)
CREATE TABLE IF NOT EXISTS public.permisos_lunas_polarizadas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dni VARCHAR(8) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    placa_vehiculo VARCHAR(10) NOT NULL,
    licencia_valida BOOLEAN DEFAULT TRUE NOT NULL,
    soat_vigente BOOLEAN DEFAULT TRUE NOT NULL,
    estado VARCHAR(20) DEFAULT 'EN_PROCESO' NOT NULL, -- EN_PROCESO, ACEPTADA, DENEGADA
    fecha_solicitud DATE DEFAULT CURRENT_DATE NOT NULL,
    fecha_resolucion TIMESTAMP WITH TIME ZONE,
    numero_resolucion VARCHAR(50),
    motivo_denegacion VARCHAR(300),
    usuario_id UUID REFERENCES public.usuarios(id) ON DELETE CASCADE NOT NULL,
    soat_id BIGINT REFERENCES public.soat(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.permisos_lunas_polarizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver sus propios permisos"
ON public.permisos_lunas_polarizadas FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Usuarios pueden registrar sus propios permisos"
ON public.permisos_lunas_polarizadas FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Lectura pública de permisos por DNI (Seguimiento público)"
ON public.permisos_lunas_polarizadas FOR SELECT
USING (true); -- Permitir select público para el buscador de seguimiento
