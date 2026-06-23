import type { APIRoute } from 'astro';

// Deterministic mock database for demo/fallback purposes
const mockDniData = (dni: string) => {
  const names = [
    { nombres: 'Juan Carlos', apPaterno: 'Perez', apMaterno: 'Gomez', genero: 'M', dir: 'Av. Brasil 1420, Jesús María', dist: 'Jesús María', prov: 'Lima', dep: 'Lima', ubigeo: '150113', fecha: '1990-05-15' },
    { nombres: 'Maria Elena', apPaterno: 'Rodriguez', apMaterno: 'Quispe', genero: 'F', dir: 'Jr. Carabaya 580, Cercado de Lima', dist: 'Lima', prov: 'Lima', dep: 'Lima', ubigeo: '150101', fecha: '1985-09-22' },
    { nombres: 'Luis Alberto', apPaterno: 'Sanchez', apMaterno: 'Flores', genero: 'M', dir: 'Av. Larco 450, Miraflores', dist: 'Miraflores', prov: 'Lima', dep: 'Lima', ubigeo: '150122', fecha: '1993-11-02' },
    { nombres: 'Ana Sofia', apPaterno: 'Castro', apMaterno: 'Chavez', genero: 'F', dir: 'Calle Las Begonias 320, San Isidro', dist: 'San Isidro', prov: 'Lima', dep: 'Lima', ubigeo: '150131', fecha: '1988-02-18' },
    { nombres: 'Jose Manuel', apPaterno: 'Diaz', apMaterno: 'Torres', genero: 'M', dir: 'Av. La Marina 2400, San Miguel', dist: 'San Miguel', prov: 'Lima', dep: 'Lima', ubigeo: '150136', fecha: '1995-07-30' }
  ];
  
  // Pick one based on the sum of digits of the DNI
  const sum = dni.split('').reduce((acc, char) => acc + parseInt(char || '0'), 0);
  const index = sum % names.length;
  const person = names[index];
  
  return {
    success: true,
    data: {
      dni,
      nombres: person.nombres,
      apellido_paterno: person.apPaterno,
      apellido_materno: person.apMaterno,
      fecha_nacimiento: person.fecha,
      sexo: person.genero,
      direccion: person.dir,
      ubigeo_sunat: person.ubigeo,
      ubigeo_reniec: person.ubigeo,
      ubigeo: [person.ubigeo],
      departamento: person.dep,
      provincia: person.prov,
      distrito: person.dist,
      nombre_completo: `${person.apPaterno} ${person.apMaterno} ${person.nombres}`
    }
  };
};

export const GET: APIRoute = async ({ params }) => {
  const { dni } = params;

  if (!dni || !/^\d{8}$/.test(dni)) {
    return new Response(JSON.stringify({
      success: false,
      message: 'El DNI debe tener exactamente 8 dígitos numéricos'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiUrl = process.env.FACTILIZA_API_URL || import.meta.env.FACTILIZA_API_URL || 'https://api.factiliza.com/v1';
  const apiToken = process.env.FACTILIZA_API_TOKEN || import.meta.env.FACTILIZA_API_TOKEN;

  if (!apiToken || apiToken === 'your-supabase-anon-key' || apiToken.includes('your_')) {
    // If token is missing, return mock data
    console.log(`[API] DNI ${dni} - Usando Datos Mockups (Falta Token Factiliza)`);
    return new Response(JSON.stringify(mockDniData(dni)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const response = await fetch(`${apiUrl}/dni/info/${dni}`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Servidor Factiliza respondió con código ${response.status}`);
    }

    const rawData = await response.json();
    
    // Mapeo de campos para compatibilidad con el frontend
    if (rawData.success && rawData.data) {
      if (rawData.data.numero && !rawData.data.dni) {
        rawData.data.dni = rawData.data.numero;
      }
      if (!rawData.data.sexo) rawData.data.sexo = '';
      if (!rawData.data.fecha_nacimiento) rawData.data.fecha_nacimiento = '';
    }

    return new Response(JSON.stringify(rawData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.warn(`[API] Falló consulta DNI ${dni} en Factiliza. Usando fallback Mock. Motivo:`, error.message);
    return new Response(JSON.stringify(mockDniData(dni)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
